"""Logging and artifact storage for job applications."""

from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from datetime import datetime, UTC
from pathlib import Path
from typing import Any, Dict, Optional

# Optional DB sink (SaaS mode). Kept lightweight and behind DATABASE_URL.
from autoapply.db.repo import db_enabled as _db_enabled
from autoapply.db.repo import insert_log_row as _insert_log_row
from autoapply.db.repo import write_run_state as _db_write_run_state
from autoapply.db.repo import read_run_state as _db_read_run_state

# Default paths for logs
DEFAULT_LOGS_PATH = "data/logs.csv"
DEFAULT_SKIPS_PATH = "data/skips.csv"
RUN_STATE_PATH = Path("data/run_state.json")

# Run status values for RunState
RUN_STATUS_IDLE = "idle"
RUN_STATUS_RUNNING = "running"
RUN_STATUS_COMPLETED = "completed"
RUN_STATUS_FAILED = "failed"
RUN_STATUS_TIMED_OUT = "timed_out"
RUN_STATUS_CANCELLED = "cancelled"
RUN_STATUS_REQUIRES_AUTH = "requires_auth"

# Standard status vocabulary. Use these only; encode detail in notes.
STATUS_APPLIED = "applied"
STATUS_SKIPPED = "skipped"
STATUS_ERROR = "error"
LOG_STATUSES = frozenset({STATUS_APPLIED, STATUS_SKIPPED, STATUS_ERROR})

# CSV column order: existing first, then new.
STANDARD_FIELDS = ["ts", "run_id", "claimant_id", "site", "job_title", "company", "url", "status", "notes"]


@dataclass(frozen=True)
class ApplicationLogEntry:
    """
    Structured log entry for a single job attempt.
    ts is added at write time; run_id and claimant_id come from context.
    """

    site: str
    job_title: str
    company: str
    url: str
    status: str  # One of STATUS_APPLIED, STATUS_SKIPPED, STATUS_ERROR
    notes: str
    run_id: str = ""
    claimant_id: str = ""

    def to_row(self) -> Dict[str, str]:
        """Convert to dict for CSV row. ts not included; log() adds it."""
        row: Dict[str, str] = {
            "site": (self.site or "").strip(),
            "job_title": (self.job_title or "").strip(),
            "company": (self.company or "").strip(),
            "url": (self.url or "").strip(),
            "status": (self.status or "").strip().lower(),
            "notes": (self.notes or "").strip()[:500],
            "run_id": (self.run_id or "").strip(),
            "claimant_id": (self.claimant_id or "").strip(),
        }
        return row


def _normalize_status(s: str) -> str:
    """Map status to standard vocabulary. 'skip' -> 'skipped' for backward compat."""
    v = (s or "").strip().lower()
    if v == "skip":
        return STATUS_SKIPPED
    if v in LOG_STATUSES:
        return v
    return v if v else STATUS_ERROR


def normalize_status_for_read(s: str) -> str:
    """
    Normalize status when reading logs (e.g. for aggregation).
    Maps 'skip' -> 'skipped' so dashboards can treat them identically.
    """
    v = (s or "").strip().lower()
    if v == "skip":
        return STATUS_SKIPPED
    if v in LOG_STATUSES:
        return v
    return v


def log(
    log_path: str | Path,
    row: Dict[str, Any] | ApplicationLogEntry,
    *,
    run_id: Optional[str] = None,
    claimant_id: Optional[str] = None,
) -> Dict[str, str]:
    """
    Log an application event to CSV.

    Accepts either an ApplicationLogEntry or a dict with at least site, job_title,
    company, url, status, notes. Ensures parent folder exists, adds ts, run_id,
    claimant_id, normalizes status to applied/skipped/error, writes headers if
    needed, appends the row, and prints it.

    Args:
        log_path: Path to the CSV log file
        row: ApplicationLogEntry or dict of log fields
        run_id: Optional run identifier (overrides entry.run_id if provided)
        claimant_id: Optional claimant identifier (overrides entry.claimant_id if provided)

    Returns:
        The logged row as a dict with ts, run_id, claimant_id, and all standard fields.
    """
    p = Path(log_path)
    p.parent.mkdir(parents=True, exist_ok=True)

    if isinstance(row, ApplicationLogEntry):
        out = row.to_row()
    else:
        out = {k: str(v).strip() if v is not None else "" for k, v in row.items()}

    out["ts"] = datetime.now(UTC).isoformat()
    out["run_id"] = (run_id or out.get("run_id") or "").strip()
    out["claimant_id"] = (claimant_id or out.get("claimant_id") or "").strip()
    out["status"] = _normalize_status(out.get("status", ""))

    all_keys = set(out.keys())
    headers: list[str] = []
    for f in STANDARD_FIELDS:
        if f in all_keys:
            headers.append(f)
            all_keys.discard(f)
    headers.extend(sorted(all_keys))

    write_headers = not p.exists()
    if p.exists():
        with p.open("r", encoding="utf-8", newline="") as f:
            r = csv.DictReader(f)
            existing = list(r.fieldnames or [])
        if existing:
            headers = existing

    complete_row = {h: out.get(h, "") for h in headers}

    with p.open("a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=headers)
        if write_headers:
            w.writeheader()
        w.writerow(complete_row)

    # SaaS mode: also persist into Postgres if configured.
    if _db_enabled():
        try:
            import os

            tenant = os.environ.get("AUTOAPPLYER_TENANT_ID", "default")
        except Exception:
            tenant = "default"
        if complete_row.get("claimant_id"):
            try:
                _insert_log_row(tenant_id=tenant, claimant_id=complete_row["claimant_id"], row=complete_row)
            except Exception:
                # DB is optional; do not break local runs if it fails.
                pass

    print_row(complete_row)
    return complete_row


def print_row(row: Dict[str, str]) -> None:
    """Print a formatted log row to console in a simple monospaced layout."""
    site = row.get("site", "-")
    title = (row.get("job_title", "") or "-").strip()[:72]
    status = (row.get("status", "") or "-").strip()
    print(f"{site:>10} | {title:<72} | {status}")


def print_summary(counts: Dict[str, int]) -> None:
    """
    Print a summary of application counts.

    Args:
        counts: Dictionary mapping status names to counts (e.g. applied, skipped, error)
    """
    print("\nRun summary")
    print("-" * 40)
    for status in sorted(counts.keys()):
        print(f"{status.title():<12}: {counts[status]}")
    print("-" * 40)


def save_artifacts(page: Any, label: str) -> None:
    """
    Save screenshot and HTML artifacts for debugging.

    Wraps Playwright calls in try/except to avoid crashing the run if screenshots fail.

    Args:
        page: Playwright page object
        label: Label to include in filenames
    """
    ts = datetime.now(UTC).strftime("%Y%m%d_%H%M%S_%f")
    outdir = Path("data/artifacts")
    outdir.mkdir(parents=True, exist_ok=True)
    png = outdir / f"{ts}_{label}.png"
    html = outdir / f"{ts}_{label}.html"
    try:
        page.screenshot(path=str(png), full_page=True)
    except Exception:
        pass
    try:
        html.write_text(page.content())
    except Exception:
        pass


@dataclass
class RunState:
    """Run-level metadata for automation. Written to data/run_state.json."""

    run_id: str
    started_at: str  # ISO timestamp
    finished_at: Optional[str] = None  # ISO timestamp when run ends
    status: str = RUN_STATUS_IDLE  # idle | running | completed | failed | timed_out | cancelled
    total_attempted: int = 0
    total_applied: int = 0
    total_skipped: int = 0
    total_error: int = 0
    notes: str = ""  # optional error message when failed/timed_out

    def to_dict(self) -> Dict[str, Any]:
        return {
            "run_id": self.run_id,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "status": self.status,
            "total_attempted": self.total_attempted,
            "total_applied": self.total_applied,
            "total_skipped": self.total_skipped,
            "total_error": self.total_error,
            "notes": (self.notes or "").strip(),
        }


def write_run_state(state: RunState, path: Path | str = RUN_STATE_PATH) -> None:
    """Write RunState to JSON file (e.g. data/run_state.json)."""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("w", encoding="utf-8") as f:
        json.dump(state.to_dict(), f, indent=2)

    # SaaS mode: also persist to DB.
    if _db_enabled():
        try:
            import os

            tenant_id = os.environ.get("AUTOAPPLYER_TENANT_ID", "default")
            claimant_id = os.environ.get("AUTOAPPLYER_CLAIMANT_ID", "")
            if claimant_id:
                _db_write_run_state(
                    tenant_id=tenant_id,
                    claimant_id=claimant_id,
                    run_id=state.run_id,
                    payload=state.to_dict(),
                )
        except Exception:
            pass


def read_run_state(path: Path | str = RUN_STATE_PATH) -> Optional[RunState]:
    """Read RunState from JSON file. Returns None if missing or invalid."""
    # SaaS mode: prefer DB state if available.
    if _db_enabled():
        try:
            import os

            tenant_id = os.environ.get("AUTOAPPLYER_TENANT_ID", "default")
            claimant_id = os.environ.get("AUTOAPPLYER_CLAIMANT_ID", "")
            if claimant_id:
                payload = _db_read_run_state(tenant_id=tenant_id, claimant_id=claimant_id)
                if isinstance(payload, dict) and payload.get("run_id"):
                    return RunState(
                        run_id=str(payload.get("run_id", "")),
                        started_at=str(payload.get("started_at", "")),
                        finished_at=payload.get("finished_at"),
                        status=str(payload.get("status", RUN_STATUS_IDLE)),
                        total_attempted=int(payload.get("total_attempted", 0)),
                        total_applied=int(payload.get("total_applied", 0)),
                        total_skipped=int(payload.get("total_skipped", 0)),
                        total_error=int(payload.get("total_error", 0)),
                        notes=str(payload.get("notes", "")),
                    )
        except Exception:
            pass

    p = Path(path)
    if not p.exists():
        return None
    try:
        with p.open("r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            return None
        return RunState(
            run_id=str(data.get("run_id", "")),
            started_at=str(data.get("started_at", "")),
            finished_at=data.get("finished_at"),
            status=str(data.get("status", RUN_STATUS_IDLE)),
            total_attempted=int(data.get("total_attempted", 0)),
            total_applied=int(data.get("total_applied", 0)),
            total_skipped=int(data.get("total_skipped", 0)),
            total_error=int(data.get("total_error", 0)),
            notes=str(data.get("notes", "")),
        )
    except Exception:
        return None
