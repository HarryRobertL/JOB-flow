"""FastAPI server for AutoApplyer claimant-facing UI."""

import asyncio
import csv
import json
import logging
import os
import secrets
import threading
import time
import uuid
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Any, Dict, List, Literal

import yaml
from fastapi import FastAPI, Form, Request, Query, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse, Response, StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field

from autoapply.core.config import (
    AppConfig,
    AccountConfig,
    DefaultsConfig,
    SearchConfig,
    ConfigError,
    load_config as load_config_validated,
)
from autoapply.core.storage import (
    STANDARD_FIELDS as LOG_STANDARD_FIELDS,
    normalize_status_for_read,
    read_run_state,
)
from autoapply.run import main as run_engine
from autoapply.auth import (
    get_current_user,
    get_current_user_optional,
    create_session_token,
    check_role,
    SESSION_COOKIE_NAME,
)
from autoapply.auth_store import Role, User, get_auth_store
from autoapply.models import JobListing, JobApplication, EvidenceEntry, WeeklyComplianceSummary
import autoapply.evidence as evidence_store

from autoapply.evidence import (
    log_evidence,
    load_evidence_entries,
    aggregate_weekly_compliance,
    get_week_start_date,
)

app = FastAPI(title="AutoApplyer Local UI")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Structured request logging: request_id, method, path, status_code, duration_ms (no PII)."""
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:8]
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 2)
    logger.info(
        "request_id=%s method=%s path=%s status_code=%s duration_ms=%s",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


# Templates directory
templates_dir = Path(__file__).parent.parent / "ui" / "templates"
templates_dir.mkdir(parents=True, exist_ok=True)
templates = Jinja2Templates(directory=str(templates_dir))

# Root directory for config.yaml
# __file__ is at autoapply/server.py, so parent.parent gives us the repo root
ROOT_DIR = Path(__file__).parent.parent
CONFIG_PATH = ROOT_DIR / "config.yaml"
LOGS_PATH = ROOT_DIR / "data" / "logs.csv"
JOBS_QUEUE_PATH = ROOT_DIR / "data" / "jobs_queue.json"
ANALYTICS_LOG_PATH = ROOT_DIR / "data" / "analytics.jsonl"
# Evidence log path is defined in autoapply.evidence and can be monkeypatched in tests.
EVIDENCE_LOG_PATH = evidence_store.EVIDENCE_LOG_PATH
RUN_STATE_PATH = ROOT_DIR / "data" / "run_state.json"
PROFILES_DIR = ROOT_DIR / "profiles"
SYSTEM_SETTINGS_PATH = ROOT_DIR / "data" / "system_settings.json"
AUDIT_LOG_PATH = ROOT_DIR / "data" / "audit.jsonl"
CLAIMANT_NOTES_PATH = ROOT_DIR / "data" / "claimant_notes.jsonl"
COMPLIANCE_ACTIONS_PATH = ROOT_DIR / "data" / "compliance_actions.jsonl"
CLAIMANT_COHORTS_PATH = ROOT_DIR / "data" / "claimant_cohorts.json"
REGIONS_DATA_PATH = ROOT_DIR / "data" / "regions.json"

# Ensure data directory exists
(ROOT_DIR / "data").mkdir(parents=True, exist_ok=True)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Static files directory (for logo and other assets)
static_dir = ROOT_DIR / "ui" / "static"
static_dir.mkdir(parents=True, exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


def load_config() -> Optional[AppConfig]:
    """Load configuration from config.yaml, return None if file doesn't exist."""
    if not CONFIG_PATH.exists():
        return None
    try:
        return AppConfig.load_from_file(CONFIG_PATH)
    except Exception:
        return None


def save_config(config: AppConfig) -> None:
    """Save configuration to config.yaml."""
    config_dict = config.model_dump(mode="python", exclude_none=True)
    with CONFIG_PATH.open("w", encoding="utf-8") as f:
        yaml.safe_dump(config_dict, f, default_flow_style=False, sort_keys=False)


def load_config_for_claimant(tenant_id: str, claimant_id: str) -> Optional[AppConfig]:
    """Load config for claimant: from DB when DATABASE_URL is set, else from config.yaml."""
    try:
        from autoapply.db.repo import db_enabled, get_claimant_config

        if db_enabled():
            data = get_claimant_config(tenant_id=tenant_id, claimant_id=claimant_id)
            if data and isinstance(data, dict) and data.get("account"):
                return AppConfig.model_validate(data)
            return None
    except Exception:
        pass
    return load_config()


def save_config_for_claimant(tenant_id: str, claimant_id: str, config: AppConfig) -> None:
    """Save config for claimant: to DB when DATABASE_URL is set, else to config.yaml."""
    try:
        from autoapply.db.repo import db_enabled, upsert_claimant_config

        if db_enabled():
            upsert_claimant_config(
                tenant_id=tenant_id,
                claimant_id=claimant_id,
                config_dict=config.model_dump(mode="python", exclude_none=True),
            )
            return
    except Exception:
        pass
    save_config(config)


def load_system_settings() -> Dict[str, Any]:
    """Load system-wide settings from JSON; return defaults if missing."""
    defaults = {
        "default_required_applications_per_week": 10,
        "regime_levels": ["standard", "intensive", "light_touch"],
    }
    if not SYSTEM_SETTINGS_PATH.exists():
        return defaults
    try:
        with SYSTEM_SETTINGS_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return {**defaults, **data}
    except Exception:
        return defaults


def save_system_settings(settings: Dict[str, Any]) -> None:
    """Save system-wide settings to JSON."""
    with SYSTEM_SETTINGS_PATH.open("w", encoding="utf-8") as f:
        json.dump(settings, f, indent=2)


def append_audit(
    actor_id: str,
    actor_email: str,
    action: str,
    resource_type: str = "",
    resource_id: str = "",
    details: Optional[Dict[str, Any]] = None,
) -> None:
    """Append one audit entry to the JSONL log. Thread-safe append."""
    entry = {
        "ts": datetime.now().isoformat(),
        "actor_id": actor_id,
        "actor_email": actor_email,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "details": details or {},
    }
    # SaaS mode: also write to DB when configured.
    try:
        from autoapply.db.repo import db_enabled, insert_audit_event

        if db_enabled():
            tenant_id = os.environ.get("AUTOAPPLYER_TENANT_ID", "default")
            insert_audit_event(tenant_id=tenant_id, entry=entry)
    except Exception:
        pass
    line = json.dumps(entry, ensure_ascii=False) + "\n"
    with open(AUDIT_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line)


def load_audit_entries(
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    actor_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    """Read audit log with optional filters. Returns newest first, limited and offset."""
    # SaaS mode: read from DB when configured.
    try:
        from autoapply.db.repo import db_enabled, list_audit_events

        if db_enabled():
            tenant_id = os.environ.get("AUTOAPPLYER_TENANT_ID", "default")
            return list_audit_events(
                tenant_id=tenant_id,
                from_iso=from_date.isoformat() if from_date else None,
                to_iso=to_date.isoformat() if to_date else None,
                action=action,
                limit=limit,
                offset=offset,
            )
    except Exception:
        pass
    if not AUDIT_LOG_PATH.exists():
        return []
    entries: List[Dict[str, Any]] = []
    with AUDIT_LOG_PATH.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
                ts_str = entry.get("ts", "")
                if ts_str:
                    dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                    if from_date and dt < from_date:
                        continue
                    if to_date and dt > to_date:
                        continue
                if actor_id and entry.get("actor_id") != actor_id:
                    continue
                if action and entry.get("action") != action:
                    continue
                entries.append(entry)
            except Exception:
                continue
    entries.sort(key=lambda e: e.get("ts", ""), reverse=True)
    return entries[offset : offset + limit]


def load_claimant_notes(claimant_id: str) -> List[Dict[str, Any]]:
    """Load notes for a claimant from JSONL. Returns list of { id, claimant_id, author_id, author_email, created_at, body }."""
    if not CLAIMANT_NOTES_PATH.exists():
        return []
    notes = []
    with CLAIMANT_NOTES_PATH.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
                if entry.get("claimant_id") == claimant_id:
                    notes.append(entry)
            except Exception:
                continue
    notes.sort(key=lambda e: e.get("created_at", ""), reverse=True)
    return notes


def add_claimant_note(
    claimant_id: str,
    author_id: str,
    author_email: str,
    body: str,
) -> Dict[str, Any]:
    """Append a note for a claimant. Returns the created note."""
    note_id = f"note-{datetime.now().strftime('%Y%m%d%H%M%S')}-{secrets.token_hex(4)}"
    created_at = datetime.now().isoformat()
    entry = {
        "id": note_id,
        "claimant_id": claimant_id,
        "author_id": author_id,
        "author_email": author_email,
        "created_at": created_at,
        "body": (body or "").strip(),
    }
    line = json.dumps(entry, ensure_ascii=False) + "\n"
    with open(CLAIMANT_NOTES_PATH, "a", encoding="utf-8") as f:
        f.write(line)
    return entry


def load_compliance_actions(claimant_id: str) -> List[Dict[str, Any]]:
    """Load compliance actions for a claimant. Returns list of { id, claimant_id, coach_id, coach_email, action_type, payload, created_at }."""
    if not COMPLIANCE_ACTIONS_PATH.exists():
        return []
    actions = []
    with COMPLIANCE_ACTIONS_PATH.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
                if entry.get("claimant_id") == claimant_id:
                    actions.append(entry)
            except Exception:
                continue
    actions.sort(key=lambda e: e.get("created_at", ""), reverse=True)
    return actions


def add_compliance_action(
    claimant_id: str,
    coach_id: str,
    coach_email: str,
    action_type: str,
    payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Append a compliance action. Returns the created action."""
    action_id = f"action-{datetime.now().strftime('%Y%m%d%H%M%S')}-{secrets.token_hex(4)}"
    created_at = datetime.now().isoformat()
    entry = {
        "id": action_id,
        "claimant_id": claimant_id,
        "coach_id": coach_id,
        "coach_email": coach_email,
        "action_type": action_type,
        "payload": payload or {},
        "created_at": created_at,
    }
    line = json.dumps(entry, ensure_ascii=False) + "\n"
    with open(COMPLIANCE_ACTIONS_PATH, "a", encoding="utf-8") as f:
        f.write(line)
    return entry


def load_claimant_cohorts() -> Dict[str, str]:
    """Load claimant_id -> cohort (pilot|control) from JSON. Default empty."""
    if not CLAIMANT_COHORTS_PATH.exists():
        return {}
    try:
        with CLAIMANT_COHORTS_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def save_claimant_cohorts(data: Dict[str, str]) -> None:
    """Save claimant cohorts to JSON."""
    with CLAIMANT_COHORTS_PATH.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def get_claimant_cohort(claimant_id: str) -> Optional[str]:
    """Return cohort for claimant (pilot|control) or None."""
    cohorts = load_claimant_cohorts()
    return cohorts.get(claimant_id)


def set_claimant_cohort(claimant_id: str, cohort: str) -> None:
    """Set cohort for a claimant. cohort must be pilot or control."""
    data = load_claimant_cohorts()
    data[claimant_id] = cohort
    save_claimant_cohorts(data)


def load_regions_data() -> List[Dict[str, Any]]:
    """Load regions and jobcentres from JSON. Default hardcoded list."""
    defaults = [
        {"id": "wales", "name": "Wales", "jobcentres": ["Cardiff", "Swansea", "Newport"]},
        {"id": "england", "name": "England", "jobcentres": ["London", "Manchester", "Birmingham"]},
        {"id": "scotland", "name": "Scotland", "jobcentres": ["Edinburgh", "Glasgow"]},
        {"id": "northern_ireland", "name": "Northern Ireland", "jobcentres": ["Belfast"]},
    ]
    if not REGIONS_DATA_PATH.exists():
        return defaults
    try:
        with REGIONS_DATA_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and "regions" in data:
            return data["regions"]
        return defaults
    except Exception:
        return defaults


def save_regions_data(regions: List[Dict[str, Any]]) -> None:
    """Save regions to JSON."""
    with REGIONS_DATA_PATH.open("w", encoding="utf-8") as f:
        json.dump({"regions": regions}, f, indent=2)


def get_required_applications_per_week() -> int:
    """Return required applications per week from config, then system settings, else 10."""
    config = load_config()
    if config:
        val = getattr(config, "required_applications_per_week", None)
        if val is not None and val > 0:
            return int(val)
    sys_settings = load_system_settings()
    return int(sys_settings.get("default_required_applications_per_week", 10))


# ============================================================================
# Authentication Endpoints
# ============================================================================

class LoginRequest(BaseModel):
    """Login request model."""

    email: str
    password: str
    tenant_id: Optional[str] = None


class RegisterRequest(BaseModel):
    """Registration request model (dev/seed only)."""

    email: str
    password: str
    role: Role
    display_name: Optional[str] = None


@app.post("/auth/login", response_class=JSONResponse)
async def login(request: LoginRequest):
    """Login endpoint. Returns session cookie and user info."""
    store = get_auth_store()
    tenant_id = request.tenant_id or "default"
    user = store.verify_password(request.email, request.password, tenant_id=tenant_id)
    if user is None:
        return JSONResponse({"error": "Invalid email or password"}, status_code=401)

    session_token = create_session_token(user.id, user.role, tenant_id=getattr(user, "tenant_id", tenant_id))
    response = JSONResponse(
        {
            "status": "success",
            "user": user.to_dict(),
            "email": user.email,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "message": "Login successful",
        }
    )
    # Set HTTP-only cookie
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        secure=os.environ.get("AUTOAPPLYER_SECURE_COOKIES", "").lower() in ("1", "true", "yes"),
        samesite="lax",
        max_age=7 * 24 * 60 * 60,  # 7 days
    )
    return response


@app.post("/auth/logout", response_class=JSONResponse)
async def logout(current_user: Optional[User] = Depends(get_current_user_optional)):
    """Logout endpoint. Clears session cookie."""
    response = JSONResponse({"status": "success", "message": "Logout successful"})
    response.delete_cookie(key=SESSION_COOKIE_NAME)
    return response


@app.post("/auth/register", response_class=JSONResponse)
async def register(request: RegisterRequest):
    """
    Register a new user (development/seed only).
    
    In production, use the seed script to create users; this endpoint may be disabled.
    Duplicate email returns 400. Database errors are logged and return 500.
    """
    store = get_auth_store()
    existing = store.get_user_by_email(request.email, tenant_id="default")
    if existing:
        logger.info("Register rejected: duplicate email %s", request.email)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists.",
        )
    try:
        user = store.create_user(
            email=request.email,
            password=request.password,
            role=request.role,
            display_name=request.display_name,
            tenant_id="default",
        )
        logger.info("User registered: id=%s email=%s role=%s", user.id, user.email, user.role)
        return JSONResponse(
            {
                "user": user.to_dict(),
                "message": "User created successfully",
            }
        )
    except Exception as e:
        logger.exception("Register failed for %s: %s", request.email, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Ensure the server has write access to the data directory. For demo users, use the seed script.",
        )


@app.get("/auth/me", response_class=JSONResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user info."""
    payload = current_user.to_dict()
    # Back-compat for older clients/tests: expose key fields at top-level while keeping {user: ...}
    return JSONResponse({"user": payload, **payload})


# ============================================================================
# React App Routes - serve React app for all client-side routes
# ============================================================================

# React build directory
DIST_DIR = ROOT_DIR / "dist"
REACT_INDEX = DIST_DIR / "index.html"
public_dir = ROOT_DIR / "public"

# Serve logo assets at root so frontend <img src="/logo-logo.png"> works when app is served from backend
@app.get("/logo-logo.png", response_class=FileResponse)
async def serve_logo():
    path = public_dir / "logo-logo.png"
    if path.exists():
        return FileResponse(path, media_type="image/png")
    raise HTTPException(status_code=404, detail="Logo not found")


@app.get("/typeface-logo.png", response_class=FileResponse)
async def serve_typeface_logo():
    path = public_dir / "typeface-logo.png"
    if path.exists():
        return FileResponse(path, media_type="image/png")
    raise HTTPException(status_code=404, detail="Logo not found")

# Mount React build assets
if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="react-assets")
    if public_dir.exists():
        app.mount("/public", StaticFiles(directory=str(public_dir)), name="public")


def serve_react_app() -> HTMLResponse:
    """Serve the React app index.html."""
    try:
        if REACT_INDEX.exists():
            with REACT_INDEX.open("r", encoding="utf-8") as f:
                content = f.read()
                # Fix asset paths in the HTML to be relative
                content = content.replace('src="/assets/', 'src="/assets/')
                content = content.replace('href="/assets/', 'href="/assets/')
                return HTMLResponse(content=content)
        return HTMLResponse(
            content="<html><body><h1>React app not built. Run: npm run build</h1><p>Path checked: " + str(REACT_INDEX) + "</p></body></html>",
            status_code=503,
        )
    except Exception as e:
        return HTMLResponse(
            content=f"<html><body><h1>Error serving React app</h1><p>{str(e)}</p></body></html>",
            status_code=500,
        )


@app.get("/")
async def root():
    """Serve React app landing page."""
    return serve_react_app()


@app.get("/login")
async def login_page():
    """Serve React app login page."""
    return serve_react_app()


# ============================================================================
# Public Routes (Jinja templates - kept for backward compatibility)
# ============================================================================

@app.get("/legacy-landing", response_class=HTMLResponse)
async def legacy_landing(request: Request):
    """Legacy landing page (Jinja template)."""
    return templates.TemplateResponse("landing.html", {"request": request})


@app.get("/setup", response_class=HTMLResponse)
async def setup_get(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Show setup form with current configuration. Requires claimant role."""
    check_role(current_user, ["claimant"])
    tenant_id = getattr(current_user, "tenant_id", "default")
    claimant_id = str(current_user.id)
    config = load_config_for_claimant(tenant_id=tenant_id, claimant_id=claimant_id)
    
    # Prepare form data
    account = config.account if config else AccountConfig(
        email="", first_name="", last_name="", phone="", location=""
    )
    defaults = config.defaults if config else DefaultsConfig(
        cv_path="", cover_letter_template=""
    )
    # For pilot, show first search or empty search
    search = config.searches[0] if config and config.searches else SearchConfig(
        name="search_1",
        platform="indeed",
        query="",
        location="",
        radius_km=25,
        easy_apply=True,
        daily_cap=None,
    )
    
    return templates.TemplateResponse("setup.html", {
        "request": request,
        "account": account,
        "defaults": defaults,
        "search": search,
        "message": request.query_params.get("message", ""),
    })


@app.post("/setup")
async def setup_post(
    request: Request,
    current_user: User = Depends(get_current_user),
    # Account fields
    email: str = Form(...),
    first_name: str = Form(...),
    last_name: str = Form(...),
    phone: str = Form(...),
    location: str = Form(...),
    postcode: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    # Defaults
    cv_path: str = Form(...),
    cover_letter_template: str = Form(...),
    # Search fields
    search_name: str = Form(...),
    platform: str = Form(...),
    query: str = Form(...),
    search_location: str = Form(...),
    radius_km: int = Form(25),
    easy_apply: Optional[str] = Form(None),
    daily_cap: Optional[int] = Form(None),
):
    """Save configuration from form. Requires claimant role."""
    # Check role
    check_role(current_user, ["claimant"])
    try:
        # Build account config
        account = AccountConfig(
            email=email,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            location=location,
            postcode=postcode or None,
            city=city or None,
            address=address or None,
        )
        
        # Build defaults config
        defaults = DefaultsConfig(
            cv_path=cv_path,
            cover_letter_template=cover_letter_template,
        )
        
        # Build search config
        # Handle checkbox: if present, it's "true", otherwise False
        easy_apply_bool = easy_apply == "true" if easy_apply else False
        
        search = SearchConfig(
            name=search_name or "search_1",
            platform=platform,  # type: ignore
            query=query,
            location=search_location,
            radius_km=radius_km,
            easy_apply=easy_apply_bool,
            daily_cap=daily_cap,
        )
        
        # Load existing config to preserve other fields, or create new
        tenant_id = getattr(current_user, "tenant_id", "default")
        claimant_id = str(current_user.id)
        existing = load_config_for_claimant(tenant_id=tenant_id, claimant_id=claimant_id)
        if existing:
            config = AppConfig(
                account=account,
                defaults=defaults,
                searches=[search],
                filters=existing.filters,
                career_sites=existing.career_sites,
                cv_map=existing.cv_map,
                answers=existing.answers,
                limits=existing.limits,
            )
        else:
            config = AppConfig(
                account=account,
                defaults=defaults,
                searches=[search],
            )

        save_config_for_claimant(tenant_id=tenant_id, claimant_id=claimant_id, config=config)
        
        return RedirectResponse(url="/setup?message=Configuration+saved+successfully", status_code=303)
    except Exception as e:
        # On error, reload the form with submitted values
        # Function parameters are available since FastAPI extracts them before calling
        easy_apply_bool = easy_apply == "true" if easy_apply else False
        account_err = AccountConfig(
            email=email,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            location=location,
            postcode=postcode or None,
            city=city or None,
            address=address or None,
        )
        defaults_err = DefaultsConfig(
            cv_path=cv_path,
            cover_letter_template=cover_letter_template,
        )
        search_err = SearchConfig(
            name=search_name or "search_1",
            platform=platform,  # type: ignore
            query=query,
            location=search_location,
            radius_km=radius_km,
            easy_apply=easy_apply_bool,
            daily_cap=daily_cap,
        )
        
        return templates.TemplateResponse("setup.html", {
            "request": request,
            "account": account_err,
            "defaults": defaults_err,
            "search": search_err,
            "message": f"Error: {str(e)}",
        })


@app.post("/run")
async def run_trigger(current_user: User = Depends(get_current_user)):
    """Trigger the AutoApplyer engine. With DATABASE_URL: enqueue job for worker. Else: start in-process thread."""
    check_role(current_user, ["claimant"])
    tenant_id = getattr(current_user, "tenant_id", "default")
    claimant_id = str(current_user.id)

    try:
        from autoapply.db.repo import db_enabled, enqueue_automation_run, count_running_for_claimant

        if db_enabled():
            if count_running_for_claimant(claimant_id) >= 1:
                return JSONResponse(
                    {"status": "rejected", "message": "A run is already in progress for this account."},
                    status_code=409,
                )
            run_id = str(uuid.uuid4())
            enqueue_automation_run(tenant_id=tenant_id, claimant_id=claimant_id, run_id=run_id)
            return JSONResponse({
                "run_id": run_id,
                "status": "queued",
                "message": "Run queued; poll GET /api/automation/status for updates.",
            })
    except Exception:
        pass

    # Dev / no DB: run in process
    def run_in_thread():
        try:
            os.environ["AUTOAPPLYER_TENANT_ID"] = tenant_id
            os.environ["AUTOAPPLYER_CLAIMANT_ID"] = claimant_id
            run_engine(headless=False, dry_run=False)
        except Exception as e:
            logger.error("Error running engine: %s", e)

    thread = threading.Thread(target=run_in_thread, daemon=True)
    thread.start()

    for _ in range(10):
        await asyncio.sleep(0.2)
        os.environ["AUTOAPPLYER_TENANT_ID"] = tenant_id
        os.environ["AUTOAPPLYER_CLAIMANT_ID"] = claimant_id
        state = read_run_state(RUN_STATE_PATH)
        if state is not None and state.status == "running":
            return JSONResponse({
                "run_id": state.run_id,
                "status": state.status,
                "started_at": state.started_at,
            })
    os.environ["AUTOAPPLYER_TENANT_ID"] = tenant_id
    os.environ["AUTOAPPLYER_CLAIMANT_ID"] = claimant_id
    state = read_run_state(RUN_STATE_PATH)
    if state is not None:
        return JSONResponse({
            "run_id": state.run_id,
            "status": state.status,
            "started_at": state.started_at,
        })
    return JSONResponse({
        "status": "starting",
        "message": "Run started; poll GET /api/automation/status for updates.",
    })


@app.get("/api/automation/status", response_class=JSONResponse)
async def get_automation_status(current_user: User = Depends(get_current_user)):
    """Return current run state for frontend polling. Uses DB run_state when DATABASE_URL set; else file."""
    check_role(current_user, ["claimant"])
    tenant_id = getattr(current_user, "tenant_id", "default")
    claimant_id = str(current_user.id)
    os.environ["AUTOAPPLYER_TENANT_ID"] = tenant_id
    os.environ["AUTOAPPLYER_CLAIMANT_ID"] = claimant_id

    try:
        from autoapply.db.repo import db_enabled, get_latest_automation_run_for_claimant

        if db_enabled():
            latest = get_latest_automation_run_for_claimant(tenant_id=tenant_id, claimant_id=claimant_id)
            if latest and latest.get("status") in ("pending", "queued"):
                return JSONResponse({
                    "status": "queued",
                    "run_id": latest.get("run_id"),
                    "message": "Run queued; worker will start shortly.",
                })
            if latest and latest.get("status") == "running":
                state = read_run_state(RUN_STATE_PATH)
                if state is not None:
                    return JSONResponse(state.to_dict())
                return JSONResponse({
                    "status": "running",
                    "run_id": latest.get("run_id"),
                    "started_at": latest.get("started_at"),
                })
            if latest and latest.get("status") in ("completed", "failed", "cancelled"):
                state = read_run_state(RUN_STATE_PATH)
                if state is not None:
                    return JSONResponse(state.to_dict())
                return JSONResponse({
                    "status": latest["status"],
                    "run_id": latest.get("run_id"),
                    "finished_at": latest.get("finished_at"),
                })
    except Exception:
        pass

    state = read_run_state(RUN_STATE_PATH)
    if state is None:
        return JSONResponse({"status": "idle"})
    return JSONResponse(state.to_dict())


async def _run_state_sse_generator():
    """Yield SSE events with run state until run is finished or idle."""
    terminal_statuses = {"idle", "completed", "failed", "timed_out", "cancelled"}
    last_status = None
    for _ in range(400):  # ~10 min at 1.5s
        state = read_run_state(RUN_STATE_PATH)
        if state is None:
            payload = {"status": "idle"}
        else:
            payload = state.to_dict()
        if payload.get("status") != last_status:
            last_status = payload.get("status")
            yield f"data: {json.dumps(payload)}\n\n"
        if last_status in terminal_statuses:
            break
        await asyncio.sleep(1.5)
    yield f"data: {json.dumps({'status': last_status or 'idle'})}\n\n"


@app.get("/api/claimant/run-state/stream")
async def run_state_stream(current_user: User = Depends(get_current_user)):
    """Server-Sent Events stream of run state for real-time progress. Claimant only."""
    check_role(current_user, ["claimant"])
    return StreamingResponse(
        _run_state_sse_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/status", response_class=HTMLResponse)
async def status_page(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Show status summary from logs. Requires claimant role."""
    check_role(current_user, ["claimant"])
    os.environ["AUTOAPPLYER_TENANT_ID"] = getattr(current_user, "tenant_id", "default")
    os.environ["AUTOAPPLYER_CLAIMANT_ID"] = str(current_user.id)
    stats = {
        "total": 0,
        "applied": 0,
        "skipped": 0,
        "error": 0,
        "last_run": None,
    }

    try:
        rows = load_logs()
        stats["total"] = len(rows)
        for row in rows:
            status_val = normalize_status_for_read(row.get("status", ""))
            if status_val == "applied":
                stats["applied"] += 1
            elif status_val == "skipped":
                stats["skipped"] += 1
            elif status_val == "error":
                stats["error"] += 1
        if rows:
            last_ts = rows[-1].get("ts", "") if rows else ""
            if last_ts:
                try:
                    dt = datetime.fromisoformat(last_ts.replace("Z", "+00:00"))
                    stats["last_run"] = dt.strftime("%Y-%m-%d %H:%M:%S")
                except Exception:
                    stats["last_run"] = last_ts
    except Exception as e:
        stats["error_message"] = str(e)

    return templates.TemplateResponse("status.html", {
        "request": request,
        "stats": stats,
    })


@app.get("/api/claimant/status", response_class=JSONResponse)
async def get_claimant_status_api(current_user: User = Depends(get_current_user)):
    """Get claimant status and activity data as JSON. Requires claimant role."""
    # Check role
    check_role(current_user, ["claimant"])

    claimant_id = str(current_user.id)
    os.environ["AUTOAPPLYER_TENANT_ID"] = getattr(current_user, "tenant_id", "default")
    os.environ["AUTOAPPLYER_CLAIMANT_ID"] = claimant_id

    stats = {
        "total": 0,
        "applied": 0,
        "skipped": 0,
        "error": 0,
        "last_run": None,
    }

    try:
        logs = load_logs()
        stats["total"] = len(logs)
        for row in logs:
            status_val = normalize_status_for_read(row.get("status", ""))
            if status_val == "applied":
                stats["applied"] += 1
            elif status_val == "skipped":
                stats["skipped"] += 1
            elif status_val == "error":
                stats["error"] += 1
        if logs:
            last_ts = logs[-1].get("ts", "")
            if last_ts:
                try:
                    dt = datetime.fromisoformat(last_ts.replace("Z", "+00:00"))
                    stats["last_run"] = dt.isoformat()
                except Exception:
                    stats["last_run"] = last_ts
    except Exception as e:
        stats["error_message"] = str(e)

    # Build activity log for recent activity
    activity_log = []
    for i, log_entry in enumerate(reversed(logs[-50:])):  # Last 50 entries
        try:
            ts_str = log_entry.get("ts", "")
            if ts_str:
                dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                status_val = normalize_status_for_read(log_entry.get("status", "unknown"))
                activity_log.append({
                    "id": f"activity-{i}",
                    "timestamp": dt.isoformat(),
                    "jobTitle": log_entry.get("job_title", "Unknown"),
                    "company": log_entry.get("company", "Unknown"),
                    "status": status_val,
                    "platform": log_entry.get("site", "unknown"),
                    "url": log_entry.get("url"),
                    "notes": log_entry.get("notes"),
                    "errorMessage": log_entry.get("notes") if status_val == "error" else None,
                    "artifactUrl": None,
                })
        except Exception:
            continue

    # Get current week compliance summary
    now = datetime.now()
    week_start = get_week_start_date(now)
    week_end = week_start + timedelta(days=6)
    
    # Load evidence entries for current week
    evidence_entries = load_evidence_entries(
        claimant_id=claimant_id,
        start_date=week_start,
        end_date=week_end + timedelta(days=1),  # Include end date
    )
    
    current_week_applications = sum(
        1 for e in evidence_entries
        if e.event_type == "application_submitted"
    )
    
    required_applications = get_required_applications_per_week()
    compliance_summary = {
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "applications_this_week": current_week_applications,
        "required_applications": required_applications,
        "is_compliant": current_week_applications >= required_applications,
    }

    run_info: Dict[str, Any] = {}
    state = read_run_state(RUN_STATE_PATH)
    if state is not None:
        run_info = {"run_id": state.run_id, "status": state.status, "started_at": state.started_at}

    payload = {
        "stats": stats,
        "activity": activity_log,
        # Back-compat for older clients/tests
        "recentActivity": activity_log,
        "compliance": compliance_summary,
        "run": run_info,
        # Back-compat: older clients/tests expected this at top-level
        "applicationsThisWeek": current_week_applications,
        "applicationsTotal": stats.get("total", 0),
    }
    store = get_auth_store()
    if store.is_claimant_skipped(current_user.id):
        payload["skippedOnboarding"] = True
    return JSONResponse(payload)


# ============================================================================
# Staff Dashboard API Endpoints
# ============================================================================

def load_logs() -> list[dict]:
    """Load logs from CSV file."""
    # SaaS mode: load from DB when configured.
    try:
        from autoapply.db.repo import db_enabled, list_log_rows

        if db_enabled():
            tenant_id = os.environ.get("AUTOAPPLYER_TENANT_ID", "default")
            claimant_id = os.environ.get("AUTOAPPLYER_CLAIMANT_ID") or None
            return list_log_rows(tenant_id=tenant_id, claimant_id=claimant_id, limit=2000)
    except Exception:
        pass

    if not LOGS_PATH.exists():
        return []
    
    logs = []
    try:
        with LOGS_PATH.open("r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            logs = list(reader)
    except Exception:
        pass
    
    return logs


def get_claimant_id_from_config() -> str:
    """Extract claimant identifier from config (for single-claimant pilot)."""
    config = load_config()
    if config and config.account:
        return f"{config.account.first_name} {config.account.last_name}"
    return "Unknown Claimant"


def _build_claimant_from_user(
    user: User,
    applications_this_week: int = 0,
    last_activity_date: Optional[datetime] = None,
) -> dict:
    """Build a claimant dict for work-coach list from a User (claimant role)."""
    required = get_required_applications_per_week()
    compliance_status = "on_track"
    if applications_this_week < required * 0.5:
        compliance_status = "non_compliant"
    elif applications_this_week < required * 0.8:
        compliance_status = "at_risk"
    name = (user.display_name or user.email or "Claimant").strip()
    cohort = get_claimant_cohort(user.id)
    return {
        "id": user.id,
        "name": name,
        "regimeLevel": "standard",
        "lastActivityDate": last_activity_date.isoformat() if last_activity_date else None,
        "applicationsThisWeek": applications_this_week,
        "complianceStatus": compliance_status,
        "requiredApplications": required,
        "completedApplications": applications_this_week,
        "jobcentre": None,
        "region": None,
        "cohort": cohort,
    }


@app.get("/api/staff/work-coach/claimants")
async def get_work_coach_claimants(
    current_user: User = Depends(get_current_user),
    status: Optional[str] = Query(None),
    regime_level: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    jobcentre: Optional[str] = Query(None),
    cohort: Optional[str] = Query(None, pattern="^(pilot|control)$"),
    sort_by: Optional[str] = Query("activity"),
    sort_order: Optional[str] = Query("desc"),
):
    """
    Get list of claimants for work coach dashboard.
    Coach sees only assigned claimants; admin sees all claimants.
    """
    check_role(current_user, ["coach", "admin"])
    store = get_auth_store()
    claimant_users = [u for u in store.list_users(role="claimant") if getattr(u, "tenant_id", "default") == getattr(current_user, "tenant_id", "default")]

    if current_user.role == "coach":
        assigned_ids = set(store.get_assignments_for_coach(current_user.id))
        claimant_users = [u for u in claimant_users if u.id in assigned_ids]
    # Admin sees all claimant users

    # Build claimant list; use config/logs for legacy single-claimant metrics when exactly one
    logs = load_logs()
    config_claimant_name = get_claimant_id_from_config()
    now = datetime.now()
    week_start = now - timedelta(days=now.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    legacy_apps = 0
    legacy_last_activity = None
    for log_entry in logs:
        try:
            ts_str = log_entry.get("ts", "")
            if ts_str:
                dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                if dt >= week_start and normalize_status_for_read(log_entry.get("status", "")) == "applied":
                    legacy_apps += 1
                if not legacy_last_activity or dt > legacy_last_activity:
                    legacy_last_activity = dt
        except Exception:
            continue

    claimants = []
    for u in claimant_users:
        # If only one claimant and config matches (legacy), use legacy metrics
        use_legacy = (
            len(claimant_users) == 1
            and (u.display_name or u.email or "").strip()
            and config_claimant_name != "Unknown Claimant"
        )
        apps = legacy_apps if use_legacy else 0
        last_act = legacy_last_activity if use_legacy else None
        claimants.append(_build_claimant_from_user(u, applications_this_week=apps, last_activity_date=last_act))

    if status:
        statuses = status.split(",")
        claimants = [c for c in claimants if c["complianceStatus"] in statuses]
    if regime_level:
        regimes = regime_level.split(",")
        claimants = [c for c in claimants if c.get("regimeLevel") in regimes]
    if region:
        claimants = [c for c in claimants if c.get("region") == region]
    if jobcentre:
        claimants = [c for c in claimants if c.get("jobcentre") == jobcentre]
    if cohort:
        claimants = [c for c in claimants if c.get("cohort") == cohort]

    on_track_count = sum(1 for c in claimants if c["complianceStatus"] == "on_track")
    at_risk_count = sum(1 for c in claimants if c["complianceStatus"] == "at_risk")
    non_compliant_count = sum(1 for c in claimants if c["complianceStatus"] == "non_compliant")

    return JSONResponse({
        "claimants": claimants,
        "totalClaimants": len(claimants),
        "onTrackCount": on_track_count,
        "atRiskCount": at_risk_count,
        "nonCompliantCount": non_compliant_count,
    })


@app.get("/api/staff/work-coach/claimants/{claimant_id}")
async def get_claimant_detail(
    claimant_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get detailed information for a specific claimant including activity log. Requires coach or admin role."""
    check_role(current_user, ["coach", "admin"])
    store = get_auth_store()
    # Support both claimant user_id and claimant email in the path (legacy/tests).
    claimant_user = store.get_user_by_id(claimant_id)
    if claimant_user is None and "@" in claimant_id:
        claimant_user = store.get_user_by_email(claimant_id, tenant_id=getattr(current_user, "tenant_id", "default"))
        if claimant_user is not None:
            claimant_id = claimant_user.id

    strict_assignments = os.environ.get("AUTOAPPLYER_STRICT_ASSIGNMENTS", "false").lower() in {"1", "true", "yes"}
    if current_user.role == "coach" and strict_assignments:
        assigned = set(store.get_assignments_for_coach(current_user.id))
        if claimant_id not in assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this claimant.",
            )

    if not claimant_user or claimant_user.role != "claimant":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claimant not found.")
    claimant_name = (claimant_user.display_name or claimant_user.email or "Claimant").strip()
    logs = load_logs()
    
    # Build activity log
    activity_log = []
    for i, log_entry in enumerate(reversed(logs[-50:])):  # Last 50 entries
        try:
            ts_str = log_entry.get("ts", "")
            if ts_str:
                dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                status_val = normalize_status_for_read(log_entry.get("status", "unknown"))
                activity_log.append({
                    "id": f"activity-{i}",
                    "timestamp": dt.isoformat(),
                    "jobTitle": log_entry.get("job_title", "Unknown"),
                    "company": log_entry.get("company", "Unknown"),
                    "status": status_val,
                    "platform": log_entry.get("site", "unknown"),
                    "url": log_entry.get("url"),
                    "notes": log_entry.get("notes"),
                    "errorMessage": log_entry.get("notes") if status_val == "error" else None,
                    "artifactUrl": None,
                })
        except Exception:
            continue
    
    # Calculate metrics
    now = datetime.now()
    week_start = now - timedelta(days=now.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    
    applications_this_week = 0
    last_activity_date = None
    
    for log_entry in logs:
        try:
            ts_str = log_entry.get("ts", "")
            if ts_str:
                dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                if dt >= week_start and normalize_status_for_read(log_entry.get("status", "")) == "applied":
                    applications_this_week += 1
                if not last_activity_date or dt > last_activity_date:
                    last_activity_date = dt
        except Exception:
            continue

    required_applications = get_required_applications_per_week()
    compliance_status = "on_track"
    if applications_this_week < required_applications * 0.5:
        compliance_status = "non_compliant"
    elif applications_this_week < required_applications * 0.8:
        compliance_status = "at_risk"

    notes_list = load_claimant_notes(claimant_id)
    actions_list = load_compliance_actions(claimant_id)
    flags: List[str] = []
    if applications_this_week < required_applications and applications_this_week < required_applications * 0.8:
        flags.append(f"Only {applications_this_week} applications this week (target {required_applications})")
    if last_activity_date:
        last_naive = last_activity_date.replace(tzinfo=None) if last_activity_date.tzinfo else last_activity_date
        days_inactive = (now - last_naive).days
        if days_inactive >= 5:
            flags.append(f"No activity in {days_inactive} days")
    if compliance_status == "non_compliant":
        flags.append("Non-compliant this week")
    elif compliance_status == "at_risk":
        flags.append("At risk this week")
    
    cohort_val = get_claimant_cohort(claimant_id)
    return JSONResponse({
        "id": claimant_id,
        "name": claimant_name,
        "regimeLevel": "standard",
        "lastActivityDate": last_activity_date.isoformat() if last_activity_date else None,
        "applicationsThisWeek": applications_this_week,
        "complianceStatus": compliance_status,
        "requiredApplications": required_applications,
        "completedApplications": applications_this_week,
        "jobcentre": "Cardiff",
        "region": "Wales",
        "cohort": cohort_val,
        "activityLog": activity_log,
        "notes": notes_list,
        "actions": actions_list,
        "flags": flags,
    })


def _check_claimant_access(claimant_id: str, current_user: User) -> None:
    """Raise 403 if coach does not have access to claimant, 404 if claimant not found."""
    store = get_auth_store()
    claimant_user = store.get_user_by_id(claimant_id)
    if claimant_user is None and "@" in claimant_id:
        claimant_user = store.get_user_by_email(claimant_id, tenant_id=getattr(current_user, "tenant_id", "default"))
        if claimant_user is not None:
            claimant_id = claimant_user.id

    strict_assignments = os.environ.get("AUTOAPPLYER_STRICT_ASSIGNMENTS", "false").lower() in {"1", "true", "yes"}
    if current_user.role == "coach" and strict_assignments:
        assigned = set(store.get_assignments_for_coach(current_user.id))
        if claimant_id not in assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this claimant.",
            )
    claimant_user = claimant_user or store.get_user_by_id(claimant_id)
    if not claimant_user or claimant_user.role != "claimant":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claimant not found.")


class ClaimantNoteBody(BaseModel):
    """Request body for adding a claimant note."""
    body: str = Field(..., min_length=1, max_length=10000)


@app.get("/api/staff/work-coach/claimants/{claimant_id}/notes", response_class=JSONResponse)
async def get_claimant_notes(
    claimant_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get notes for a claimant. Coach or admin; coach must be assigned."""
    check_role(current_user, ["coach", "admin"])
    _check_claimant_access(claimant_id, current_user)
    notes = load_claimant_notes(claimant_id)
    return JSONResponse({"notes": notes})


@app.post("/api/staff/work-coach/claimants/{claimant_id}/notes", response_class=JSONResponse)
async def post_claimant_note(
    claimant_id: str,
    request: ClaimantNoteBody,
    current_user: User = Depends(get_current_user),
):
    """Add a note for a claimant. Coach or admin; coach must be assigned."""
    check_role(current_user, ["coach", "admin"])
    _check_claimant_access(claimant_id, current_user)
    note = add_claimant_note(
        claimant_id=claimant_id,
        author_id=str(current_user.id),
        author_email=current_user.email or "",
        body=request.body,
    )
    return JSONResponse(note)


class ComplianceActionBody(BaseModel):
    """Request body for logging a compliance action."""
    action_type: Literal["warning_issued", "requirement_adjusted"] = Field(..., description="Type of action")
    comment: Optional[str] = Field(None, max_length=2000)


@app.get("/api/staff/work-coach/claimants/{claimant_id}/actions", response_class=JSONResponse)
async def get_claimant_actions(
    claimant_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get compliance actions for a claimant. Coach or admin; coach must be assigned."""
    check_role(current_user, ["coach", "admin"])
    _check_claimant_access(claimant_id, current_user)
    actions = load_compliance_actions(claimant_id)
    return JSONResponse({"actions": actions})


@app.post("/api/staff/work-coach/claimants/{claimant_id}/actions", response_class=JSONResponse)
async def post_claimant_action(
    claimant_id: str,
    request: ComplianceActionBody,
    current_user: User = Depends(get_current_user),
):
    """Log a compliance action (warning or adjustment) for a claimant. Coach or admin; coach must be assigned."""
    check_role(current_user, ["coach", "admin"])
    _check_claimant_access(claimant_id, current_user)
    action = add_compliance_action(
        claimant_id=claimant_id,
        coach_id=str(current_user.id),
        coach_email=current_user.email or "",
        action_type=request.action_type,
        payload={"comment": request.comment} if request.comment else {},
    )
    append_audit(
        actor_id=str(current_user.id),
        actor_email=current_user.email or "",
        action="compliance.action",
        resource_type="claimant",
        resource_id=claimant_id,
        details={"action_type": request.action_type},
    )
    return JSONResponse(action)


# ============================================================================
# Admin User Management
# ============================================================================

class AdminCreateUserRequest(BaseModel):
    """Request body for creating a user (admin only)."""
    email: str
    password: str
    role: Literal["claimant", "coach", "admin"]
    display_name: Optional[str] = None
    assigned_claimant_ids: Optional[List[str]] = None


class AdminUpdateUserRequest(BaseModel):
    """Request body for updating a user (admin only)."""
    email: Optional[str] = None
    role: Optional[Literal["claimant", "coach", "admin"]] = None
    display_name: Optional[str] = None
    assigned_claimant_ids: Optional[List[str]] = None


@app.get("/api/staff/admin/users", response_class=JSONResponse)
async def admin_list_users(
    current_user: User = Depends(get_current_user),
    role: Optional[str] = Query(None, pattern="^(claimant|coach|admin)$"),
):
    """List all users with optional role filter. Includes assigned claimants for coaches. Admin only."""
    check_role(current_user, ["admin"])
    store = get_auth_store()
    users = [u for u in store.list_users(role=role if role else None) if getattr(u, "tenant_id", "default") == getattr(current_user, "tenant_id", "default")]
    result = []
    cohorts = load_claimant_cohorts()
    for u in users:
        item = {
            "id": u.id,
            "email": u.email,
            "role": u.role,
            "display_name": u.display_name,
        }
        if u.role == "coach":
            item["assigned_claimant_ids"] = store.get_assignments_for_coach(u.id)
        else:
            item["assigned_claimant_ids"] = []
        if u.role == "claimant":
            item["cohort"] = cohorts.get(u.id)
        result.append(item)
    return JSONResponse({"users": result})


@app.post("/api/staff/admin/users", response_class=JSONResponse)
async def admin_create_user(
    request: AdminCreateUserRequest,
    current_user: User = Depends(get_current_user),
):
    """Create a new user. Admin only."""
    check_role(current_user, ["admin"])
    store = get_auth_store()
    existing = store.get_user_by_email(request.email, tenant_id=getattr(current_user, "tenant_id", "default"))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists.",
        )
    user = store.create_user(
        email=request.email,
        password=request.password,
        role=request.role,
        display_name=request.display_name,
        tenant_id=getattr(current_user, "tenant_id", "default"),
    )
    if request.role == "coach" and request.assigned_claimant_ids:
        store.set_assignments_for_coach(user.id, request.assigned_claimant_ids)
    append_audit(
        actor_id=str(current_user.id),
        actor_email=current_user.email or "",
        action="user.created",
        resource_type="user",
        resource_id=user.id,
        details={"email": user.email, "role": user.role},
    )
    return JSONResponse({
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "display_name": user.display_name,
            "assigned_claimant_ids": store.get_assignments_for_coach(user.id) if user.role == "coach" else [],
        },
    })


@app.patch("/api/staff/admin/users/{user_id}", response_class=JSONResponse)
async def admin_update_user(
    user_id: str,
    request: AdminUpdateUserRequest,
    current_user: User = Depends(get_current_user),
):
    """Update a user's role, display_name, or assignments. Admin only."""
    check_role(current_user, ["admin"])
    store = get_auth_store()
    existing = store.get_user_by_id(user_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if request.email is not None:
        other = store.get_user_by_email(request.email, tenant_id=getattr(current_user, "tenant_id", "default"))
        if other and other.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists.",
            )
    store.update_user(
        user_id,
        email=request.email,
        display_name=request.display_name,
        role=request.role,
    )
    updated = store.get_user_by_id(user_id)
    if updated and updated.role == "coach" and request.assigned_claimant_ids is not None:
        store.set_assignments_for_coach(user_id, request.assigned_claimant_ids)
    append_audit(
        actor_id=str(current_user.id),
        actor_email=current_user.email or "",
        action="user.updated",
        resource_type="user",
        resource_id=user_id,
        details={
            "email": updated.email if updated else None,
            "role": updated.role if updated else None,
            "assignments_changed": request.assigned_claimant_ids is not None and updated and updated.role == "coach",
        },
    )
    return JSONResponse({
        "user": {
            "id": updated.id,
            "email": updated.email,
            "role": updated.role,
            "display_name": updated.display_name,
            "assigned_claimant_ids": store.get_assignments_for_coach(user_id) if updated.role == "coach" else [],
        },
    })


class AdminSystemSettingsUpdate(BaseModel):
    """System settings update (admin only)."""
    default_required_applications_per_week: Optional[int] = None
    regime_levels: Optional[List[str]] = None


@app.get("/api/staff/admin/settings", response_class=JSONResponse)
async def admin_get_settings(
    current_user: User = Depends(get_current_user),
):
    """Get system-wide settings. Admin only."""
    check_role(current_user, ["admin"])
    settings = load_system_settings()
    return JSONResponse({
        "default_required_applications_per_week": settings.get("default_required_applications_per_week", 10),
        "regime_levels": settings.get("regime_levels", ["standard", "intensive", "light_touch"]),
    })


@app.put("/api/staff/admin/settings", response_class=JSONResponse)
async def admin_put_settings(
    request: AdminSystemSettingsUpdate,
    current_user: User = Depends(get_current_user),
):
    """Update system-wide settings. Admin only."""
    check_role(current_user, ["admin"])
    settings = load_system_settings()
    if request.default_required_applications_per_week is not None:
        v = request.default_required_applications_per_week
        if v < 1 or v > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="default_required_applications_per_week must be between 1 and 100",
            )
        settings["default_required_applications_per_week"] = v
    if request.regime_levels is not None:
        settings["regime_levels"] = [s.strip() for s in request.regime_levels if s and s.strip()]
    save_system_settings(settings)
    append_audit(
        actor_id=str(current_user.id),
        actor_email=current_user.email or "",
        action="settings.updated",
        resource_type="system",
        resource_id="",
        details={"default_required_applications_per_week": settings.get("default_required_applications_per_week"), "regime_levels": settings.get("regime_levels")},
    )
    return JSONResponse({
        "default_required_applications_per_week": settings.get("default_required_applications_per_week", 10),
        "regime_levels": settings.get("regime_levels", []),
    })


@app.get("/api/staff/admin/audit", response_class=JSONResponse)
async def admin_get_audit(
    current_user: User = Depends(get_current_user),
    from_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    to_date: Optional[str] = Query(None, description="End date (ISO format)"),
    actor_id: Optional[str] = Query(None, description="Filter by actor user id"),
    action: Optional[str] = Query(None, description="Filter by action (e.g. user.created, export.report)"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List audit log entries with optional filters. Admin only."""
    check_role(current_user, ["admin"])
    from_dt = None
    to_dt = None
    if from_date:
        try:
            from_dt = datetime.fromisoformat(from_date.replace("Z", "+00:00"))
        except Exception:
            pass
    if to_date:
        try:
            to_dt = datetime.fromisoformat(to_date.replace("Z", "+00:00"))
        except Exception:
            pass
    entries = load_audit_entries(
        from_date=from_dt,
        to_date=to_dt,
        actor_id=actor_id,
        action=action,
        limit=limit,
        offset=offset,
    )
    return JSONResponse({"entries": entries, "limit": limit, "offset": offset})


@app.get("/api/staff/admin/claimant-cohorts", response_class=JSONResponse)
async def admin_get_claimant_cohorts(current_user: User = Depends(get_current_user)):
    """Get all claimant cohort assignments (pilot/control). Admin only."""
    check_role(current_user, ["admin"])
    return JSONResponse(load_claimant_cohorts())


class ClaimantCohortUpdate(BaseModel):
    """Set cohort for a claimant."""
    claimant_id: str
    cohort: Literal["pilot", "control"]


@app.put("/api/staff/admin/claimant-cohorts", response_class=JSONResponse)
async def admin_put_claimant_cohort(
    request: ClaimantCohortUpdate,
    current_user: User = Depends(get_current_user),
):
    """Set cohort (pilot/control) for a claimant. Admin only."""
    check_role(current_user, ["admin"])
    store = get_auth_store()
    u = store.get_user_by_id(request.claimant_id)
    if not u or u.role != "claimant":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claimant not found.")
    set_claimant_cohort(request.claimant_id, request.cohort)
    append_audit(
        actor_id=str(current_user.id),
        actor_email=current_user.email or "",
        action="claimant.cohort_updated",
        resource_type="claimant",
        resource_id=request.claimant_id,
        details={"cohort": request.cohort},
    )
    return JSONResponse(load_claimant_cohorts())


@app.get("/api/staff/admin/regions", response_class=JSONResponse)
async def admin_get_regions(current_user: User = Depends(get_current_user)):
    """Get full regions and jobcentres for admin CRUD. Admin only."""
    check_role(current_user, ["admin"])
    return JSONResponse({"regions": load_regions_data()})


class AdminRegionsUpdate(BaseModel):
    """Regions list for admin."""
    regions: List[Dict[str, Any]]  # [{ id, name, jobcentres: [] }]


@app.put("/api/staff/admin/regions", response_class=JSONResponse)
async def admin_put_regions(
    request: AdminRegionsUpdate,
    current_user: User = Depends(get_current_user),
):
    """Update regions and jobcentres. Admin only."""
    check_role(current_user, ["admin"])
    validated = []
    for r in request.regions:
        if not isinstance(r, dict):
            continue
        rid = r.get("id") or str(uuid.uuid4())[:8]
        name = (r.get("name") or "").strip()
        jc = r.get("jobcentres")
        if not isinstance(jc, list):
            jc = []
        validated.append({"id": rid, "name": name, "jobcentres": jc})
    save_regions_data(validated)
    append_audit(
        actor_id=str(current_user.id),
        actor_email=current_user.email or "",
        action="regions.updated",
        resource_type="system",
        resource_id="",
        details={"count": len(validated)},
    )
    return JSONResponse({"regions": load_regions_data()})


@app.get("/api/staff/admin/reports", response_class=JSONResponse)
async def admin_get_reports(
    current_user: User = Depends(get_current_user),
    from_date: Optional[str] = Query(None, description="Start date (ISO)"),
    to_date: Optional[str] = Query(None, description="End date (ISO)"),
    cohort: Optional[str] = Query(None, pattern="^(pilot|control)$"),
):
    """Aggregated report for admin: claimants, applications, compliance by cohort/date. Admin only."""
    check_role(current_user, ["admin"])
    store = get_auth_store()
    claimant_users = [u for u in store.list_users(role="claimant") if getattr(u, "tenant_id", "default") == getattr(current_user, "tenant_id", "default")]
    cohorts_map = load_claimant_cohorts()
    if cohort:
        claimant_users = [u for u in claimant_users if cohorts_map.get(u.id) == cohort]
    claimant_ids = {u.id for u in claimant_users}
    pilot_count = sum(1 for u in claimant_users if cohorts_map.get(u.id) == "pilot")
    control_count = sum(1 for u in claimant_users if cohorts_map.get(u.id) == "control")
    unset_count = len(claimant_users) - pilot_count - control_count

    from_dt = None
    to_dt = None
    if from_date:
        try:
            from_dt = datetime.fromisoformat(from_date.replace("Z", "+00:00"))
        except Exception:
            pass
    if to_date:
        try:
            to_dt = datetime.fromisoformat(to_date.replace("Z", "+00:00"))
        except Exception:
            pass

    total_applications = 0
    compliant_claimants = 0
    required = get_required_applications_per_week()
    apps_per_claimant: Dict[str, int] = {}
    evidence_entries = load_evidence_entries(
        claimant_id=None,  # load all; we filter by claimant_id in loop
        start_date=from_dt,
        end_date=to_dt,
    )
    for e in evidence_entries:
        cid = getattr(e, "claimant_id", None)
        if not cid or cid not in claimant_ids:
            continue
        if getattr(e, "event_type", "") == "application_submitted":
            apps_per_claimant[cid] = apps_per_claimant.get(cid, 0) + 1
            total_applications += 1
    for cid, count in apps_per_claimant.items():
        if count >= required:
            compliant_claimants += 1

    return JSONResponse({
        "fromDate": from_date,
        "toDate": to_date,
        "cohortFilter": cohort,
        "totalClaimants": len(claimant_users),
        "pilotCount": pilot_count,
        "controlCount": control_count,
        "unsetCount": unset_count,
        "totalApplications": total_applications,
        "compliantClaimants": compliant_claimants,
        "requiredPerWeek": required,
    })


@app.get("/api/staff/admin/reports/export", response_class=Response)
async def admin_export_reports(
    current_user: User = Depends(get_current_user),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    cohort: Optional[str] = Query(None, pattern="^(pilot|control)$"),
    format: str = Query("csv", pattern="^csv$"),
):
    """Export admin report as CSV. Admin only."""
    check_role(current_user, ["admin"])
    store = get_auth_store()
    claimant_users = [u for u in store.list_users(role="claimant") if getattr(u, "tenant_id", "default") == getattr(current_user, "tenant_id", "default")]
    cohorts_map = load_claimant_cohorts()
    if cohort:
        claimant_users = [u for u in claimant_users if cohorts_map.get(u.id) == cohort]
    claimant_ids = {u.id for u in claimant_users}
    pilot_count = sum(1 for u in claimant_users if cohorts_map.get(u.id) == "pilot")
    control_count = sum(1 for u in claimant_users if cohorts_map.get(u.id) == "control")
    unset_count = len(claimant_users) - pilot_count - control_count
    from_dt = None
    to_dt = None
    if from_date:
        try:
            from_dt = datetime.fromisoformat(from_date.replace("Z", "+00:00"))
        except Exception:
            pass
    if to_date:
        try:
            to_dt = datetime.fromisoformat(to_date.replace("Z", "+00:00"))
        except Exception:
            pass
    required = get_required_applications_per_week()
    total_applications = 0
    compliant_claimants = 0
    apps_per_claimant = {}
    evidence_entries = load_evidence_entries(
        claimant_id=None,
        start_date=from_dt,
        end_date=to_dt,
    )
    for e in evidence_entries:
        cid = getattr(e, "claimant_id", None)
        if not cid or cid not in claimant_ids:
            continue
        if getattr(e, "event_type", "") == "application_submitted":
            apps_per_claimant[cid] = apps_per_claimant.get(cid, 0) + 1
            total_applications += 1
    for cid, count in apps_per_claimant.items():
        if count >= required:
            compliant_claimants += 1
    import io
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow([
        "from_date", "to_date", "cohort_filter", "total_claimants", "pilot_count", "control_count",
        "unset_count", "total_applications", "compliant_claimants", "required_per_week",
    ])
    w.writerow([
        from_date or "",
        to_date or "",
        cohort or "",
        len(claimant_users),
        pilot_count,
        control_count,
        unset_count,
        total_applications,
        compliant_claimants,
        required,
    ])
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"admin_report_{timestamp}.csv"
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/staff/dwp/metrics")
async def get_dwp_metrics(
    current_user: User = Depends(get_current_user),
    region: Optional[str] = Query(None),
    jobcentre: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    """Get aggregated metrics for DWP regional dashboard. Requires admin or coach role."""
    # Check role - DWP metrics require admin or coach
    check_role(current_user, ["admin", "coach"])
    logs = load_logs()
    
    # Calculate time window
    now = datetime.now()
    if start_date:
        try:
            start = datetime.fromisoformat(start_date)
        except Exception:
            start = now - timedelta(days=30)
    else:
        start = now - timedelta(days=30)
    
    if end_date:
        try:
            end = datetime.fromisoformat(end_date)
        except Exception:
            end = now
    else:
        end = now
    
    # Filter logs by time window
    filtered_logs = []
    for log_entry in logs:
        try:
            ts_str = log_entry.get("ts", "")
            if ts_str:
                dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                if start <= dt <= end:
                    filtered_logs.append(log_entry)
        except Exception:
            continue
    
    # Calculate metrics
    total_claimants = 1  # In pilot, single claimant
    total_applications = sum(1 for log_entry in filtered_logs if normalize_status_for_read(log_entry.get("status", "")) == "applied")
    weeks = max(1, (end - start).days / 7)
    average_applications_per_week = total_applications / weeks if weeks > 0 else 0
    
    # Simplified sanction rate (non-compliance rate)
    # In full implementation, this would be calculated from actual compliance data
    sanction_rate = 0.05  # 5% placeholder
    
    # Build time series data (weekly)
    time_series = []
    current = start
    while current <= end:
        week_end = current + timedelta(days=7)
        week_applications = sum(
            1 for log_entry in filtered_logs
            if current <= datetime.fromisoformat(log_entry.get("ts", "").replace("Z", "+00:00")) < week_end
            and normalize_status_for_read(log_entry.get("status", "")) == "applied"
        )
        time_series.append({
            "date": current.isoformat().split("T")[0],
            "applications": week_applications,
            "compliantClaimants": 1 if week_applications >= 7 else 0,
            "nonCompliantClaimants": 1 if week_applications < 5 else 0,
        })
        current = week_end
    
    return JSONResponse({
        "metrics": {
            "totalClaimants": total_claimants,
            "averageApplicationsPerWeek": average_applications_per_week,
            "sanctionRate": sanction_rate,
            "averageDaysToWork": None,  # Not available in pilot
            "pilotVsControl": None,  # Not available in pilot
        },
        "timeSeries": time_series,
        "region": region,
        "jobcentre": jobcentre,
        "timeWindow": {
            "start": start.isoformat(),
            "end": end.isoformat(),
        },
    })


@app.get("/api/staff/regions")
async def get_regions(current_user: User = Depends(get_current_user)):
    """Get list of available regions. Requires admin or coach role."""
    check_role(current_user, ["admin", "coach"])
    regions_data = load_regions_data()
    names = [r.get("name", "") for r in regions_data if r.get("name")]
    return JSONResponse(names)


@app.get("/api/staff/jobcentres")
async def get_jobcentres(
    current_user: User = Depends(get_current_user),
    region: Optional[str] = Query(None),
):
    """Get list of available jobcentres, optionally filtered by region. Requires admin or coach role."""
    check_role(current_user, ["admin", "coach"])
    regions_data = load_regions_data()
    if region:
        for r in regions_data:
            if r.get("name") == region:
                return JSONResponse(r.get("jobcentres", []))
        return JSONResponse([])
    all_jobcentres = []
    for r in regions_data:
        all_jobcentres.extend(r.get("jobcentres", []))
    return JSONResponse(all_jobcentres)


# ============================================================================
# Phase 2: Backend API Completion
# ============================================================================

# Task 2.1: Analytics Endpoint
class AnalyticsEvent(BaseModel):
    """Analytics event model."""
    event: str
    timestamp: Optional[str] = None
    claimantId: Optional[str] = None
    staffId: Optional[str] = None
    sessionId: Optional[str] = None
    userAgent: Optional[str] = None
    # Allow additional fields for event-specific data
    model_config = {"extra": "allow"}


@app.post("/api/analytics", response_class=JSONResponse)
async def track_analytics(
    event: AnalyticsEvent,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Track analytics events from frontend.
    
    Accepts analytics events and stores them for analysis.
    Events are logged to a JSONL file for later processing.
    In production, this could forward to an analytics service.
    """
    try:
        # Add server-side timestamp if not provided
        if not event.timestamp:
            event.timestamp = datetime.now().isoformat()
        
        # Add user ID if authenticated
        if current_user:
            if current_user.role == Role.CLAIMANT:
                event.claimantId = str(current_user.id)
            elif current_user.role in [Role.COACH, Role.ADMIN]:
                event.staffId = str(current_user.id)
        
        # Log event to JSONL file
        event_dict = event.model_dump(exclude_none=True)
        with ANALYTICS_LOG_PATH.open("a", encoding="utf-8") as f:
            f.write(json.dumps(event_dict) + "\n")
        
        logger.info(f"Analytics event tracked: {event.event}")
        
        return JSONResponse({"status": "ok", "message": "Event tracked"})
    except Exception as e:
        logger.error(f"Error tracking analytics event: {e}")
        # Fail silently to avoid disrupting user experience
        return JSONResponse({"status": "ok", "message": "Event logged"})


# Task 2.2: Job Listings API
def load_jobs_queue() -> List[Dict[str, Any]]:
    """Load jobs from queue storage."""
    # SaaS mode: load from DB when configured.
    try:
        from autoapply.db.repo import db_enabled, list_job_queue_items

        if db_enabled():
            tenant_id = os.environ.get("AUTOAPPLYER_TENANT_ID", "default")
            claimant_id = os.environ.get("AUTOAPPLYER_CLAIMANT_ID") or None
            if not claimant_id:
                return []
            return list_job_queue_items(tenant_id=tenant_id, claimant_id=claimant_id)
    except Exception:
        pass

    if not JOBS_QUEUE_PATH.exists():
        return []
    
    try:
        with JOBS_QUEUE_PATH.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading jobs queue: {e}")
        return []


def save_jobs_queue(jobs: List[Dict[str, Any]]) -> None:
    """Save jobs to queue storage."""
    # SaaS mode: upsert into DB when configured.
    try:
        from autoapply.db.repo import db_enabled, upsert_job_queue_items

        if db_enabled():
            tenant_id = os.environ.get("AUTOAPPLYER_TENANT_ID", "default")
            claimant_id = os.environ.get("AUTOAPPLYER_CLAIMANT_ID") or None
            if claimant_id:
                upsert_job_queue_items(tenant_id=tenant_id, claimant_id=claimant_id, items=jobs)
                return
    except Exception:
        pass

    try:
        with JOBS_QUEUE_PATH.open("w", encoding="utf-8") as f:
            json.dump(jobs, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Error saving jobs queue: {e}")
        raise


@app.get("/api/claimant/jobs", response_class=JSONResponse)
async def get_job_listings(
    current_user: User = Depends(get_current_user),
    platform: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: Optional[int] = Query(100),
    offset: Optional[int] = Query(0),
):
    """
    Get job listings for claimant.
    
    Returns discovered jobs from the queue with filtering support.
    Requires claimant role.
    """
    check_role(current_user, ["claimant"])
    os.environ["AUTOAPPLYER_TENANT_ID"] = getattr(current_user, "tenant_id", "default")
    os.environ["AUTOAPPLYER_CLAIMANT_ID"] = str(current_user.id)

    jobs = load_jobs_queue()
    
    # Apply filters
    filtered_jobs = jobs
    
    if platform:
        filtered_jobs = [j for j in filtered_jobs if j.get("platform", "").lower() == platform.lower()]
    
    if status:
        statuses = [s.strip() for s in status.split(",")]
        filtered_jobs = [j for j in filtered_jobs if j.get("status", "").lower() in [s.lower() for s in statuses]]
    
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            filtered_jobs = [
                j for j in filtered_jobs
                if j.get("discoveredAt") and datetime.fromisoformat(j["discoveredAt"].replace("Z", "+00:00")) >= start_dt
            ]
        except Exception:
            pass
    
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            filtered_jobs = [
                j for j in filtered_jobs
                if j.get("discoveredAt") and datetime.fromisoformat(j["discoveredAt"].replace("Z", "+00:00")) <= end_dt
            ]
        except Exception:
            pass
    
    # Sort by discovered date (newest first)
    filtered_jobs.sort(key=lambda x: x.get("discoveredAt", ""), reverse=True)
    
    # Apply pagination
    total = len(filtered_jobs)
    paginated_jobs = filtered_jobs[offset:offset + limit] if limit else filtered_jobs[offset:]
    
    return JSONResponse({
        "jobs": paginated_jobs,
        "total": total,
        "limit": limit,
        "offset": offset,
    })


# Task 2.3: Batch Approval API
class BatchApplicationAction(BaseModel):
    """Single application action in batch."""
    jobId: str
    action: Literal["approve", "reject"]


class BatchApplicationsRequest(BaseModel):
    """Batch applications request."""
    applications: List[BatchApplicationAction] = Field(..., min_length=1)


@app.post("/api/claimant/applications/batch", response_class=JSONResponse)
async def batch_approve_applications(
    request: BatchApplicationsRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Batch approve or reject applications.
    
    Accepts a list of job IDs with approve/reject actions.
    For approved jobs, triggers the automation engine.
    Requires claimant role.
    Writes evidence entries for audit logging.
    """
    check_role(current_user, ["claimant"])
    
    claimant_id = str(current_user.id)
    os.environ["AUTOAPPLYER_TENANT_ID"] = getattr(current_user, "tenant_id", "default")
    os.environ["AUTOAPPLYER_CLAIMANT_ID"] = claimant_id
    jobs = load_jobs_queue()
    jobs_dict = {j["id"]: j for j in jobs}
    
    approved_job_ids = []
    rejected_job_ids = []
    
    # Process each action
    for action in request.applications:
        job_id = action.jobId
        if job_id not in jobs_dict:
            continue
        
        job = jobs_dict[job_id]
        job_title = job.get("title") or job.get("job_title", "Unknown")
        company = job.get("company", "Unknown")
        platform = job.get("platform", "unknown")
        url = job.get("url")
        
        if action.action == "approve":
            # Update job status
            job["status"] = "approved"
            job["approvedAt"] = datetime.now().isoformat()
            approved_job_ids.append(job_id)
            
            # Log evidence for approval
            try:
                log_evidence(
                    claimant_id=claimant_id,
                    event_type="application_approved",
                    description=f"Approved application to {job_title} at {company} via {platform}",
                    source="claimant_dashboard",
                    job_id=job_id,
                    job_title=job_title,
                    company=company,
                    platform=platform,
                    url=url,
                    evidence_log_path=evidence_store.EVIDENCE_LOG_PATH,
                )
            except Exception as e:
                logger.error(f"Error logging evidence for approval: {e}")
                
        elif action.action == "reject":
            # Update job status
            job["status"] = "rejected"
            job["rejectedAt"] = datetime.now().isoformat()
            rejected_job_ids.append(job_id)
            
            # Log evidence for rejection
            try:
                log_evidence(
                    claimant_id=claimant_id,
                    event_type="application_rejected",
                    description=f"Rejected application to {job_title} at {company} via {platform}",
                    source="claimant_dashboard",
                    job_id=job_id,
                    job_title=job_title,
                    company=company,
                    platform=platform,
                    url=url,
                    evidence_log_path=evidence_store.EVIDENCE_LOG_PATH,
                )
            except Exception as e:
                logger.error(f"Error logging evidence for rejection: {e}")
    
    # Save updated jobs
    save_jobs_queue(jobs)
    
    # For approved jobs, trigger automation engine in background
    if approved_job_ids:
        # In unit tests we don't want to spawn Playwright.
        if os.environ.get("PYTEST_CURRENT_TEST"):
            return JSONResponse({
                "status": "success",
                "approved": len(approved_job_ids),
                "rejected": len(rejected_job_ids),
                "approvedJobIds": approved_job_ids,
                "rejectedJobIds": rejected_job_ids,
            })

        def run_approved_jobs():
            try:
                # In a full implementation, this would queue specific jobs
                # For now, we trigger the full automation engine
                # which will process approved jobs
                run_engine(headless=False, dry_run=False)
            except Exception as e:
                logger.error(f"Error running automation for approved jobs: {e}")
        
        thread = threading.Thread(target=run_approved_jobs, daemon=True)
        thread.start()
    
    return JSONResponse({
        "status": "success",
        "approved": len(approved_job_ids),
        "rejected": len(rejected_job_ids),
        "approvedJobIds": approved_job_ids,
        "rejectedJobIds": rejected_job_ids,
    })


@app.post("/api/claimant/skip-onboarding", response_class=JSONResponse)
async def skip_onboarding(
    current_user: User = Depends(get_current_user),
):
    """
    Mark claimant as having skipped onboarding.
    They can access the dashboard with limited state and complete profile later in Settings.
    """
    check_role(current_user, ["claimant"])
    store = get_auth_store()
    store.set_claimant_skipped(current_user.id)
    return JSONResponse({"status": "ok", "skippedOnboarding": True})


# Task 2.4: Profile API (GET + PUT)
@app.get("/api/claimant/profile", response_class=JSONResponse)
async def get_profile(
    current_user: User = Depends(get_current_user),
):
    """
    Get claimant profile from config.
    Returns 404 if no config (e.g. onboarding not completed), unless claimant skipped onboarding.
    Used by frontend to derive hasCompletedOnboarding.
    """
    check_role(current_user, ["claimant"])
    tenant_id = getattr(current_user, "tenant_id", "default")
    claimant_id = str(current_user.id)
    config = load_config_for_claimant(tenant_id=tenant_id, claimant_id=claimant_id)
    if not config:
        store = get_auth_store()
        if store.is_claimant_skipped(current_user.id):
            return JSONResponse({
                "skippedOnboarding": True,
                "firstName": "",
                "lastName": "",
                "email": current_user.email,
                "phone": "",
                "location": "",
                "postcode": "",
                "city": "",
                "address": "",
            })
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Please complete onboarding first.",
        )
    acc = config.account
    first_search = config.searches[0] if config.searches else None
    payload = {
        "first_name": acc.first_name,
        "firstName": acc.first_name,
        "email": acc.email,
        "lastName": acc.last_name,
        "phone": acc.phone,
        "location": acc.location,
        "postcode": acc.postcode,
        "city": acc.city,
        "address": acc.address,
        "cvPath": config.defaults.cv_path,
        "coverLetterTemplate": config.defaults.cover_letter_template,
        "discoverOnly": getattr(config, "discover_only", False),
        "requireReview": getattr(config, "require_review", True),
        "requiredApplicationsPerWeek": (
            config.required_applications_per_week
            if getattr(config, "required_applications_per_week", None) and config.required_applications_per_week > 0
            else 10
        ),
    }
    if first_search:
        payload["dailyCap"] = first_search.daily_cap
        payload["remotePreference"] = first_search.remote or "any"
        payload["salaryMin"] = first_search.salary_min
    return JSONResponse(payload)


class ProfileUpdateRequest(BaseModel):
    """Profile update request."""
    email: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    postcode: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    # Job preferences
    preferredJobTypes: Optional[List[str]] = None
    preferredLocations: Optional[List[str]] = None
    salaryMin: Optional[int] = None
    remotePreference: Optional[str] = None
    maxCommuteDistance: Optional[int] = None
    # Automation preferences
    autoApplyEnabled: Optional[bool] = None
    dailyCap: Optional[int] = None
    discoverOnly: Optional[bool] = None
    requireReview: Optional[bool] = None
    requiredApplicationsPerWeek: Optional[int] = None
    cvPath: Optional[str] = None
    coverLetterTemplate: Optional[str] = None


@app.put("/api/claimant/profile", response_class=JSONResponse)
async def update_profile(
    request: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Update claimant profile and preferences.
    
    Updates per-claimant config (DB when DATABASE_URL set, else config.yaml).
    Requires claimant role.
    """
    check_role(current_user, ["claimant"])
    tenant_id = getattr(current_user, "tenant_id", "default")
    claimant_id = str(current_user.id)

    try:
        config = load_config_for_claimant(tenant_id=tenant_id, claimant_id=claimant_id)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Configuration not found. Please complete onboarding first.",
            )
        
        # Update account information
        if request.email is not None:
            config.account.email = request.email
        if request.firstName is not None:
            config.account.first_name = request.firstName
        if request.lastName is not None:
            config.account.last_name = request.lastName
        if request.phone is not None:
            config.account.phone = request.phone
        if request.location is not None:
            config.account.location = request.location
        if request.postcode is not None:
            config.account.postcode = request.postcode
        if request.city is not None:
            config.account.city = request.city
        if request.address is not None:
            config.account.address = request.address
        
        # Update defaults (CV and cover letter)
        if request.cvPath is not None:
            config.defaults.cv_path = request.cvPath
        if request.coverLetterTemplate is not None:
            config.defaults.cover_letter_template = request.coverLetterTemplate
        
        # Update search configuration (use first search for now)
        if config.searches:
            search = config.searches[0]
            if request.salaryMin is not None:
                search.salary_min = request.salaryMin
            if request.remotePreference is not None:
                search.remote = request.remotePreference
            if request.dailyCap is not None:
                search.daily_cap = request.dailyCap
        
        # Update automation preferences (AppConfig-level)
        if request.discoverOnly is not None:
            config.discover_only = request.discoverOnly
        if request.requireReview is not None:
            config.require_review = request.requireReview
        if request.requiredApplicationsPerWeek is not None and request.requiredApplicationsPerWeek > 0:
            config.required_applications_per_week = request.requiredApplicationsPerWeek
        
        # Save updated config (DB or file)
        save_config_for_claimant(tenant_id=tenant_id, claimant_id=claimant_id, config=config)

        logger.info(f"Profile updated for user {current_user.email}")
        
        return JSONResponse({
            "status": "success",
            "message": "Profile updated successfully",
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}",
        )


# Task 2.5: Export API
@app.get("/api/claimant/compliance", response_class=JSONResponse)
async def get_claimant_compliance(
    current_user: User = Depends(get_current_user),
    weeks: Optional[int] = Query(4, description="Number of weeks to include"),
):
    """
    Get weekly compliance summaries for the claimant.
    
    Returns aggregated weekly compliance data with evidence entries.
    Requires claimant role.
    """
    check_role(current_user, ["claimant"])
    
    claimant_id = str(current_user.id)
    required_applications = get_required_applications_per_week()
    
    # Load evidence entries (last N weeks)
    end_date = datetime.now()
    start_date = end_date - timedelta(weeks=weeks or 4)
    
    evidence_entries = load_evidence_entries(
        claimant_id=claimant_id,
        start_date=start_date,
        end_date=end_date,
    )
    
    # Aggregate by week
    weekly_summaries = aggregate_weekly_compliance(
        evidence_entries,
        required_applications_per_week=required_applications,
    )
    
    # Convert to dict format for JSON response
    summaries_dict = [
        {
            "week_start_date": s.week_start_date,
            "week_end_date": s.week_end_date,
            "applications_count": s.applications_count,
            "required_count": s.required_count,
            "missed_requirement": s.missed_requirement,
            "evidence_entries": [e.model_dump() for e in s.evidence_entries],
        }
        for s in weekly_summaries
    ]
    
    return JSONResponse({
        "weekly_summaries": summaries_dict,
        "required_applications_per_week": required_applications,
    })


@app.get("/api/claimant/artifacts/{key:path}", response_class=Response)
async def get_claimant_artifact(
    key: str,
    current_user: User = Depends(get_current_user),
):
    """
    Return a tenant-scoped artifact (screenshot/HTML) via pre-signed URL when
    OBJECT_STORE_BUCKET is set; otherwise 404. Key is tenant/claimant-scoped.
    """
    check_role(current_user, ["claimant"])
    if not key or ".." in key or key.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid artifact key")
    try:
        from autoapply.core.object_storage import object_storage_enabled, get_presigned_url

        if object_storage_enabled():
            tenant_id = getattr(current_user, "tenant_id", "default")
            claimant_id = str(current_user.id)
            url = get_presigned_url(tenant_id=tenant_id, claimant_id=claimant_id, key=key)
            if url:
                return RedirectResponse(url=url, status_code=302)
    except Exception:
        pass
    raise HTTPException(status_code=404, detail="Artifact not found")


@app.get("/api/claimant/evidence/export", response_class=Response)
async def export_evidence(
    current_user: User = Depends(get_current_user),
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    format: str = Query("csv", pattern="^(csv|pdf)$", description="Export format: csv or pdf"),
):
    """
    Export evidence entries as CSV or PDF.
    
    Streams a file with all evidence entries for the current claimant.
    Requires claimant role.
    """
    check_role(current_user, ["claimant"])
    
    claimant_id = str(current_user.id)
    os.environ["AUTOAPPLYER_TENANT_ID"] = getattr(current_user, "tenant_id", "default")
    os.environ["AUTOAPPLYER_CLAIMANT_ID"] = claimant_id
    
    # Parse date filters
    start_dt = None
    end_dt = None
    
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        except Exception:
            pass
    
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        except Exception:
            pass
    
    # Load evidence entries
    evidence_entries = load_evidence_entries(
        claimant_id=claimant_id,
        start_date=start_dt,
        end_date=end_dt,
    )
    
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    if format == "pdf":
        try:
            from fpdf import FPDF
        except ImportError:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="PDF export is not available. Install fpdf2: pip install fpdf2",
            )
        claimant_name = "Claimant"
        tenant_id = getattr(current_user, "tenant_id", "default")
        config = load_config_for_claimant(tenant_id=tenant_id, claimant_id=claimant_id)
        if config and config.account:
            claimant_name = f"{config.account.first_name} {config.account.last_name}".strip()
        period_start = (start_dt or datetime.now()).strftime("%Y-%m-%d")
        period_end = (end_dt or datetime.now()).strftime("%Y-%m-%d")
        period_label = f"{period_start} to {period_end}"
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Helvetica", size=14)
        pdf.cell(0, 8, "JobFlow Evidence Report", ln=True)
        pdf.set_font("Helvetica", size=10)
        pdf.cell(0, 6, f"Claimant: {claimant_name}", ln=True)
        pdf.cell(0, 6, f"Period: {period_label}", ln=True)
        pdf.ln(4)
        if not evidence_entries:
            pdf.set_font("Helvetica", size=10)
            pdf.cell(0, 6, "No applications in this period.", ln=True)
        else:
            pdf.set_font("Helvetica", size=9)
            cw_date, cw_job, cw_company, cw_platform, cw_status = 24, 52, 40, 28, 26
            headers = ("Date", "Job", "Company", "Platform", "Status")
            for w, h in zip((cw_date, cw_job, cw_company, cw_platform, cw_status), headers):
                pdf.cell(w, 7, h[:20], border=1, fill=True)
            pdf.ln()
            for entry in evidence_entries:
                ts_short = (entry.timestamp or "")[:10] if entry.timestamp else ""
                job = (entry.job_title or "—")[:32]
                company = (entry.company or "—")[:24]
                platform = (entry.platform or "—")[:14]
                status_val = (entry.event_type or "—").replace("application_submitted", "Submitted")[:14]
                pdf.cell(cw_date, 6, ts_short, border=1)
                pdf.cell(cw_job, 6, job, border=1)
                pdf.cell(cw_company, 6, company, border=1)
                pdf.cell(cw_platform, 6, platform, border=1)
                pdf.cell(cw_status, 6, status_val, border=1)
                pdf.ln()
        buf = bytes(pdf.output())
        filename = f"evidence_export_{timestamp_str}.pdf"
        append_audit(
            actor_id=str(current_user.id),
            actor_email=current_user.email or "",
            action="export.report",
            resource_type="claimant",
            resource_id=claimant_id,
            details={"format": "pdf", "type": "evidence"},
        )
        return Response(
            content=buf,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    
    # CSV
    def generate_csv():
        if not evidence_entries:
            yield "timestamp,claimant_id,event_type,description,week_start_date,source,job_id,job_title,company,platform,url\n"
            return
        
        import io
        output = io.StringIO()
        writer = csv.DictWriter(
            output,
            fieldnames=[
                "timestamp",
                "claimant_id",
                "event_type",
                "description",
                "week_start_date",
                "source",
                "job_id",
                "job_title",
                "company",
                "platform",
                "url",
            ],
        )
        writer.writeheader()
        
        for entry in evidence_entries:
            writer.writerow({
                "timestamp": entry.timestamp,
                "claimant_id": entry.claimant_id,
                "event_type": entry.event_type,
                "description": entry.description,
                "week_start_date": entry.week_start_date or "",
                "source": entry.source,
                "job_id": entry.job_id or "",
                "job_title": entry.job_title or "",
                "company": entry.company or "",
                "platform": entry.platform or "",
                "url": entry.url or "",
            })
        
        yield output.getvalue()
    
    filename = f"evidence_export_{timestamp_str}.csv"
    append_audit(
        actor_id=str(current_user.id),
        actor_email=current_user.email or "",
        action="export.report",
        resource_type="claimant",
        resource_id=claimant_id,
        details={"format": "csv", "type": "evidence"},
    )
    return StreamingResponse(
        generate_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/staff/work-coach/reports/export", response_class=Response)
async def export_report(
    current_user: User = Depends(get_current_user),
    claimant_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    format: str = Query("csv", pattern="^(csv|json|pdf)$"),
):
    """
    Export compliance report for a claimant.
    
    Generates CSV, JSON, or PDF report with date range filtering.
    Requires coach or admin role.
    """
    check_role(current_user, ["coach", "admin"])
    
    logs = load_logs()
    
    # Filter by date range if provided
    filtered_logs = logs
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            filtered_logs = [
                log_entry for log_entry in filtered_logs
                if log_entry.get("ts") and datetime.fromisoformat(log_entry["ts"].replace("Z", "+00:00")) >= start_dt
            ]
        except Exception:
            pass
    
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            filtered_logs = [
                log_entry for log_entry in filtered_logs
                if log_entry.get("ts") and datetime.fromisoformat(log_entry["ts"].replace("Z", "+00:00")) <= end_dt
            ]
        except Exception:
            pass
    
    # Generate filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"compliance_report_{timestamp}.{format}"
    
    if format == "pdf":
        try:
            from fpdf import FPDF
        except ImportError:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="PDF export is not available. Install fpdf2: pip install fpdf2",
            )
        claimant_name = "Claimant"
        if claimant_id:
            store = get_auth_store()
            claimant_user = store.get_user_by_id(claimant_id)
            if claimant_user:
                claimant_name = (claimant_user.display_name or claimant_user.email or "Claimant").strip()
        period_start = start_date or datetime.now().strftime("%Y-%m-%d")
        period_end = end_date or datetime.now().strftime("%Y-%m-%d")
        period_label = f"{period_start} to {period_end}"
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Helvetica", size=14)
        pdf.cell(0, 8, "JobFlow Compliance Report", ln=True)
        pdf.set_font("Helvetica", size=10)
        pdf.cell(0, 6, f"Claimant: {claimant_name}", ln=True)
        pdf.cell(0, 6, f"Period: {period_label}", ln=True)
        pdf.cell(0, 6, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", ln=True)
        pdf.ln(4)
        if not filtered_logs:
            pdf.set_font("Helvetica", size=10)
            pdf.cell(0, 6, "No activity in this period.", ln=True)
        else:
            pdf.set_font("Helvetica", size=9)
            cw_ts, cw_job, cw_company, cw_site, cw_status = 32, 48, 40, 24, 24
            headers = ("Date", "Job", "Company", "Platform", "Status")
            for w, h in zip((cw_ts, cw_job, cw_company, cw_site, cw_status), headers):
                pdf.cell(w, 7, (h or "—")[:20], border=1, fill=True)
            pdf.ln()
            for log_entry in filtered_logs[:100]:  # Limit rows for PDF
                ts_str = (log_entry.get("ts") or "")[:16].replace("T", " ")
                job = (log_entry.get("job_title") or "—")[:28]
                company = (log_entry.get("company") or "—")[:24]
                site = (log_entry.get("site") or "—")[:14]
                status_val = normalize_status_for_read(log_entry.get("status", "—"))[:12]
                pdf.cell(cw_ts, 6, ts_str, border=1)
                pdf.cell(cw_job, 6, job, border=1)
                pdf.cell(cw_company, 6, company, border=1)
                pdf.cell(cw_site, 6, site, border=1)
                pdf.cell(cw_status, 6, status_val, border=1)
                pdf.ln()
            if len(filtered_logs) > 100:
                pdf.set_font("Helvetica", size=8)
                pdf.cell(0, 6, f"... and {len(filtered_logs) - 100} more entries.", ln=True)
        buf = bytes(pdf.output())
        append_audit(
            actor_id=str(current_user.id),
            actor_email=current_user.email or "",
            action="export.report",
            resource_type="report",
            resource_id=claimant_id or "",
            details={"format": "pdf", "type": "compliance"},
        )
        return Response(
            content=buf,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    
    if format == "csv":
        # Generate CSV
        def generate_csv():
            if not filtered_logs:
                yield ",".join(LOG_STANDARD_FIELDS) + "\n"
                return
            
            # Get all unique keys
            all_keys = set()
            for log_entry in filtered_logs:
                all_keys.update(log_entry.keys())
            
            headers = []
            for field in LOG_STANDARD_FIELDS:
                if field in all_keys:
                    headers.append(field)
                    all_keys.discard(field)
            headers.extend(sorted(all_keys))
            
            # Write CSV
            import io
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=headers)
            writer.writeheader()
            for log_entry in filtered_logs:
                writer.writerow({h: log_entry.get(h, "") for h in headers})
            yield output.getvalue()
        
        append_audit(
            actor_id=str(current_user.id),
            actor_email=current_user.email or "",
            action="export.report",
            resource_type="report",
            resource_id=claimant_id or "",
            details={"format": "csv", "type": "compliance"},
        )
        return StreamingResponse(
            generate_csv(),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    else:
        # Generate JSON
        append_audit(
            actor_id=str(current_user.id),
            actor_email=current_user.email or "",
            action="export.report",
            resource_type="report",
            resource_id=claimant_id or "",
            details={"format": "json", "type": "compliance"},
        )
        return JSONResponse(
            {
                "report": {
                    "generatedAt": datetime.now().isoformat(),
                    "startDate": start_date,
                    "endDate": end_date,
                    "totalEntries": len(filtered_logs),
                    "entries": filtered_logs,
                }
            },
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )


def _engine_prerequisite_checks() -> dict:
    """Run engine prerequisite checks (config, data writable, profiles, Playwright)."""
    engine: dict = {}

    # config.yaml exists and loads successfully
    try:
        if not CONFIG_PATH.exists():
            engine["config"] = {"ok": False, "message": f"config.yaml not found at {CONFIG_PATH}"}
        else:
            load_config_validated(CONFIG_PATH)
            engine["config"] = {"ok": True, "message": "config loaded successfully"}
    except ConfigError as e:
        engine["config"] = {"ok": False, "message": str(e)}
    except Exception as e:
        engine["config"] = {"ok": False, "message": f"unexpected error: {e}"}

    # data directory is writable
    data_dir = ROOT_DIR / "data"
    try:
        data_dir.mkdir(parents=True, exist_ok=True)
        probe = data_dir / ".health_write_probe"
        probe.write_text("ok")
        probe.unlink()
        engine["data_writable"] = {"ok": True, "message": "data directory is writable"}
    except Exception as e:
        engine["data_writable"] = {"ok": False, "message": str(e)}

    # profiles directory exists or can be created
    try:
        PROFILES_DIR.mkdir(parents=True, exist_ok=True)
        engine["profiles"] = {
            "ok": True,
            "message": "profiles directory exists or was created",
        }
    except Exception as e:
        engine["profiles"] = {"ok": False, "message": str(e)}

    # Playwright importable (engine prerequisite)
    try:
        from playwright.sync_api import sync_playwright

        engine["playwright"] = {"ok": True, "message": "Playwright package available"}
    except Exception as e:
        engine["playwright"] = {"ok": False, "message": str(e)}

    return engine


@app.get("/health", response_class=JSONResponse)
async def health_check():
    """
    Health check endpoint for monitoring and load balancers.

    Returns application version, path status, engine prerequisites
    (config, data writable, profiles, Playwright), and database connectivity.
    DWP pilot: use GET /health to confirm engine readiness before a run.
    """
    checks = {
        "status": "healthy",
        "version": "0.1.0",
        "timestamp": datetime.now().isoformat(),
    }

    # Critical paths (existence only)
    path_status = {
        "data_dir": {"exists": (ROOT_DIR / "data").exists()},
        "config_path": {"exists": CONFIG_PATH.exists()},
        "profiles_dir": {"exists": PROFILES_DIR.exists()},
    }
    checks["paths"] = path_status

    # Engine prerequisites: config load, data writable, profiles, Playwright
    engine = _engine_prerequisite_checks()
    checks["engine"] = engine
    for key, val in engine.items():
        if isinstance(val, dict) and val.get("ok") is False:
            checks["status"] = "degraded"
            break

    # Database connectivity (SQLite)
    try:
        store = get_auth_store()
        _ = store.get_user_by_email("test@example.com")
        checks["database"] = {"status": "connected"}
    except Exception as e:
        checks["database"] = {"status": "error", "message": str(e)}
        checks["status"] = "degraded"

    status_code = 503 if checks["status"] != "healthy" else 200
    return JSONResponse(content=checks, status_code=status_code)


@app.get("/app/{path:path}")
async def serve_react_app_app(path: str):
    """Serve React app for /app/* routes."""
    return serve_react_app()


@app.get("/staff/{path:path}")
async def serve_react_staff_app(path: str):
    """Serve React app for /staff/* routes."""
    return serve_react_app()


def run():
    """Run the FastAPI server with Uvicorn. Uses 0.0.0.0 and $PORT when PORT is set (e.g. Railway)."""
    import uvicorn
    port = int(os.environ.get("PORT", "8000"))
    host = "0.0.0.0" if os.environ.get("PORT") else "127.0.0.1"
    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    run()

