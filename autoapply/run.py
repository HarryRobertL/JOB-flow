"""Main engine logic for AutoApplyer."""

import sys
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Callable, Dict, Optional

from playwright.sync_api import Page

from autoapply.adapters.indeed import _pause_with_jitter
from autoapply.core.adapters_base import AdapterContext, Job
from autoapply.core.browser import NAVIGATION_TIMEOUT_MS, get_browser
from autoapply.core.config import ConfigError, default_config_path, load_config
from autoapply.core.router import detect, get_adapter
from autoapply.core import storage
from autoapply.core.storage import (
    RUN_STATE_PATH,
    RUN_STATUS_CANCELLED,
    RUN_STATUS_COMPLETED,
    RUN_STATUS_FAILED,
    RUN_STATUS_REQUIRES_AUTH,
    RUN_STATUS_RUNNING,
    RUN_STATUS_TIMED_OUT,
    STATUS_APPLIED,
    STATUS_ERROR,
    STATUS_SKIPPED,
)
from autoapply.core.storage import RunState, write_run_state


def _run_timed_out(deadline: float) -> bool:
    """True if current time >= deadline (monotonic)."""
    return time.monotonic() >= deadline


def _caps_exceeded(
    applied: int,
    per_site_applied: Dict[str, int],
    site: str,
    daily_cap: int,
    per_site_cap: int,
) -> bool:
    """True if we would exceed daily or per-site cap by attempting one more application."""
    if applied >= daily_cap:
        return True
    n = per_site_applied.get(site, 0)
    return n >= per_site_cap


def announce_before_apply(title: str, company: str, url: str) -> None:
    """Announce before applying to a job."""
    job_title = (title or "").strip() or "(unknown title)"
    employer = (company or "").strip() or "(unknown company)"
    print(f"\nApplying: {job_title} @ {employer}")
    if url:
        print(f"Target URL: {url}")


def announce_submission_success(title: str, company: str, confirmation: dict | None) -> None:
    """Announce successful submission."""
    if not confirmation:
        return
    snippet = (confirmation or {}).get("snippet", "")
    if not snippet:
        return
    job_title = (title or "").strip() or "(unknown title)"
    employer = (company or "").strip() or "(unknown company)"
    print(f"Submission confirmed for {job_title} @ {employer}:")
    print(f"  {snippet.strip()}")


def wait_for_cloudflare_clear(
    page: Page,
    context: str = "",
    interactive: bool = False,
    timeout_seconds: int = 240,
) -> bool:
    """
    Detect the Cloudflare verification interstitial and hold execution until it clears.

    Args:
        page: Playwright page object
        context: Context label for logging
        interactive: Whether to wait for user input
        timeout_seconds: Maximum time to wait

    Returns:
        True if the challenge disappears before timing out
    """
    def _blocked() -> bool:
        try:
            challenge = page.locator("text=Additional Verification Required")
            if challenge.count() > 0 and challenge.first.is_visible():
                return True
        except Exception:
            pass
        try:
            verifying = page.locator("text=/Verifying/i")
            if verifying.count() > 0 and verifying.first.is_visible():
                return True
        except Exception:
            pass
        return False

    if not _blocked():
        return True

    label = context or page.url
    print(f"\nCloudflare challenge detected while accessing {label or 'Indeed'}")
    print("Solve the verification in the open browser window.")

    if interactive:
        try:
            input("Press Enter once the challenge has cleared to continue...\n")
        except EOFError:
            pass

    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        if not _blocked():
            print("Cloudflare verification cleared. Resuming automation.")
            return True
        page.wait_for_timeout(2000)

    print("Timed out waiting for Cloudflare verification. Continuing, but subsequent requests may be blocked.")
    return False


def print_banner(searches: list) -> None:
    """Print startup banner with configured searches."""
    divider = "=" * 48
    print(divider)
    print("AutoApply starting")
    print(divider)
    if not searches:
        print("No searches configured.")
        return
    print("Configured searches:")
    for search in searches:
        platform = getattr(search, "platform", None) or "unknown"
        query = getattr(search, "query", "") or ""
        location = getattr(search, "location", "") or ""
        name = getattr(search, "name", "") or ""
        if name:
            print(f" - [{platform}] {name}: {query or '(no query)'} @ {location or 'anywhere'}")
        else:
            print(f" - [{platform}] {query or '(no query)'} @ {location or 'anywhere'}")
    print(divider)


def reached_cap(counts: Dict[str, int], cap: int | None) -> bool:
    """Check if daily apply cap has been reached."""
    if not cap:
        return False
    return counts.get(STATUS_APPLIED, 0) >= cap


def _generate_run_id() -> str:
    """Short run identifier for this execution."""
    return uuid.uuid4().hex[:12]


def main(
    config_path: str | Path | None = None,
    headless: bool = False,
    dry_run: bool = False,
    search: str | None = None,
) -> int:
    """
    Main entry point for the AutoApplyer engine.

    Args:
        config_path: Path to the configuration YAML file. If None, uses load_default()
        headless: Whether to run browser in headless mode
        dry_run: If True, simulate runs without actually applying
        search: Optional search name to filter to a single search

    Returns:
        Exit code (0 for success, non-zero for errors)
    """
    # Load configuration: from DB when worker set AUTOAPPLYER_TENANT_ID/CLAIMANT_ID, else from file
    cfg = None
    tenant_id = None
    claimant_id_env = None
    try:
        import os
        tenant_id = os.environ.get("AUTOAPPLYER_TENANT_ID")
        claimant_id_env = os.environ.get("AUTOAPPLYER_CLAIMANT_ID")
        if tenant_id and claimant_id_env:
            from autoapply.db.repo import db_enabled, get_claimant_config
            from autoapply.core.config import AppConfig
            if db_enabled():
                data = get_claimant_config(tenant_id=tenant_id, claimant_id=claimant_id_env)
                if data and isinstance(data, dict) and data.get("account"):
                    cfg = AppConfig.model_validate(data)
    except Exception:
        pass
    if cfg is None:
        path = config_path if config_path is not None else default_config_path()
        try:
            cfg = load_config(path)
        except ConfigError as e:
            print(f"Configuration error: {e}", file=sys.stderr)
            return 1

    # Convert to dict for backward compatibility with adapters
    cfg_dict = cfg.to_dict()
    # Ensure legacy 'cv' key exists for adapters expecting it
    if "defaults" in cfg_dict and "cv" not in cfg_dict["defaults"]:
        cfg_dict["defaults"]["cv"] = cfg_dict["defaults"].get("cv_path", "")

    # Filter searches if search name provided
    searches_to_run = cfg.searches
    if search:
        filtered = [s for s in cfg.searches if getattr(s, "name", None) == search]
        if not filtered:
            print(f"Error: Search named '{search}' not found in configuration.", file=sys.stderr)
            print(f"Available searches: {[getattr(s, 'name', 'unnamed') for s in cfg.searches]}", file=sys.stderr)
            return 1
        searches_to_run = filtered
        if dry_run:
            print(f"[DRY RUN] Filtered to search: {search}")

    if not searches_to_run:
        print("No searches configured. Add entries under config.yaml > searches to begin.", file=sys.stderr)
        return 1

    # Ensure data directory exists
    Path("data/logs.csv").parent.mkdir(parents=True, exist_ok=True)

    if dry_run:
        print("[DRY RUN] Would run with the following configuration:")
        print_banner(searches_to_run)
        print("[DRY RUN] Exiting without starting browser.")
        return 0

    print_banner(searches_to_run)

    run_id = _generate_run_id()
    claimant_id = (claimant_id_env if claimant_id_env else "") or f"{cfg.account.first_name} {cfg.account.last_name}".strip() or ""
    log_path = "data/logs.csv"

    # Counters and caps from config
    counts: Dict[str, int] = {STATUS_APPLIED: 0, STATUS_SKIPPED: 0, STATUS_ERROR: 0}
    per_site_applied: Dict[str, int] = {"indeed": 0, "greenhouse": 0, "lever": 0}
    limits_dict = cfg_dict.get("limits", {})
    daily_cap = limits_dict.get("daily_apply_cap") or 60
    per_site_cap = limits_dict.get("per_site_cap") or 40
    run_timeout_minutes = getattr(cfg.limits, "run_timeout_minutes", 60) or 60
    run_deadline = time.monotonic() + run_timeout_minutes * 60.0

    run_state = RunState(
        run_id=run_id,
        started_at=datetime.now(UTC).isoformat(),
        status=RUN_STATUS_RUNNING,
        total_attempted=0,
        total_applied=0,
        total_skipped=0,
        total_error=0,
        notes="",
    )
    write_run_state(run_state)

    def _sync_run_state() -> None:
        run_state.total_applied = counts.get(STATUS_APPLIED, 0)
        run_state.total_skipped = counts.get(STATUS_SKIPPED, 0)
        run_state.total_error = counts.get(STATUS_ERROR, 0)
        run_state.total_attempted = (
            run_state.total_applied + run_state.total_skipped + run_state.total_error
        )
        write_run_state(run_state)

    exit_reason = RUN_STATUS_COMPLETED

    # Get browser with persistent profile (per claimant when tenant/claimant from env)
    if tenant_id and claimant_id_env:
        profile_dir = f"profiles/{tenant_id}/{claimant_id_env}"
    else:
        profile_dir = "profiles/default"
    try:
        pw, browser, page = get_browser(profile_dir=profile_dir, headless=headless)
    except Exception as e:
        print(f"Failed to start browser: {e}", file=sys.stderr)
        run_state.status = RUN_STATUS_FAILED
        run_state.finished_at = datetime.now(UTC).isoformat()
        run_state.notes = str(e)[:500]
        write_run_state(run_state)
        return 1

    interactive = sys.stdin.isatty()

    def _wait_for_verification(p: Page, label: str = "") -> None:
        wait_for_cloudflare_clear(p, label, interactive=interactive)

    def _log(entry: dict) -> None:
        storage.log(log_path, entry, run_id=run_id, claimant_id=claimant_id)

    def _save_artifacts(page_or_frame: object, label: str) -> None:
        storage.save_artifacts(page_or_frame, label)

    ctx = AdapterContext(
        log=_log,
        save_artifacts=_save_artifacts,
        dry_run=dry_run,
        wait_for_verification=_wait_for_verification,
        per_site_applied=per_site_applied,
        per_site_cap=per_site_cap,
        daily_cap=daily_cap,
    )

    exit_error: Optional[str] = None
    try:
        # Initialize Indeed session (used by Indeed adapter and skip processing)
        page.goto("https://uk.indeed.com/", wait_until="domcontentloaded")
        page.wait_for_timeout(3000)
        wait_for_cloudflare_clear(page, "Indeed landing page", interactive=interactive)
        if not headless:
            print("Complete any Indeed or Cloudflare verification in the opened browser window.")
            if interactive:
                try:
                    input("Press Enter here once you are signed in and past any checks...")
                except EOFError:
                    pass
            else:
                print("Non-interactive session detected. Waiting for Cloudflare verification to clear (up to 4 minutes).")
                wait_for_cloudflare_clear(page, "Indeed verification", interactive=False, timeout_seconds=240)

        stop_run = False
        for search_cfg in searches_to_run:
            if _run_timed_out(run_deadline):
                print("Run timeout exceeded. Stopping.")
                exit_reason = RUN_STATUS_TIMED_OUT
                exit_error = "run timeout exceeded"
                _log({"site": "engine", "job_title": "", "company": "", "url": "", "status": STATUS_ERROR, "notes": "run timeout exceeded"})
                stop_run = True
                break

            if reached_cap(counts, daily_cap):
                print("Daily apply cap reached. Stopping gracefully.")
                break

            adapter = get_adapter(search_cfg.platform)
            if adapter is None:
                print(f"Warning: Unknown platform '{search_cfg.platform}' for search '{search_cfg.name}'. Skipping.", file=sys.stderr)
                continue

            try:
                jobs = adapter.discover_jobs(search_cfg, cfg, page, ctx)
            except Exception as e:
                print(f"Error discovering jobs for '{search_cfg.name}' ({search_cfg.platform}): {e}", file=sys.stderr)
                counts[STATUS_ERROR] = counts.get(STATUS_ERROR, 0) + 1
                _sync_run_state()
                continue

            pause_range = search_cfg.pause_between_apps_seconds
            if pause_range is None:
                pause_range = limits_dict.get("pause_between_apps_seconds", [6, 18])
            if isinstance(pause_range, (list, tuple)) and len(pause_range) >= 2:
                pause_min, pause_max = float(pause_range[0]), float(pause_range[1])
            else:
                pause_min, pause_max = 6.0, 18.0

            for job in jobs:
                if _run_timed_out(run_deadline):
                    print("Run timeout exceeded. Stopping.")
                    exit_reason = RUN_STATUS_TIMED_OUT
                    exit_error = "run timeout exceeded"
                    _log({"site": "engine", "job_title": "", "company": "", "url": "", "status": STATUS_ERROR, "notes": "run timeout exceeded"})
                    stop_run = True
                    break
                if reached_cap(counts, daily_cap):
                    print("Daily apply cap reached. Stopping.")
                    stop_run = True
                    break
                site_key = job.site or adapter.name
                if _caps_exceeded(
                    counts.get(STATUS_APPLIED, 0), per_site_applied, site_key, daily_cap, per_site_cap
                ):
                    continue

                try:
                    result = adapter.apply_to_job(job, cfg, page, ctx)
                except Exception as e:
                    print(f"Error applying to {job.url}: {e}", file=sys.stderr)
                    _log({
                        "site": adapter.name,
                        "job_title": job.title or "",
                        "company": job.company or "",
                        "url": job.url,
                        "status": STATUS_ERROR,
                        "notes": str(e)[:180],
                    })
                    counts[STATUS_ERROR] = counts.get(STATUS_ERROR, 0) + 1
                    _sync_run_state()
                    continue

                counts[result.status] = counts.get(result.status, 0) + 1
                if result.status == STATUS_APPLIED and result.site_applied:
                    per_site_applied[result.site_applied] = per_site_applied.get(result.site_applied, 0) + 1
                if result.status == STATUS_APPLIED:
                    _pause_with_jitter(pause_min, pause_max)
                _sync_run_state()

            if stop_run:
                break
            if reached_cap(counts, daily_cap):
                print("Daily apply cap reached. Skipping remaining searches.")
                break

            # Process skips (Greenhouse/Lever URLs deferred from Indeed) after Indeed searches
            if search_cfg.platform == "indeed":
                skips_path = Path("data/skips.csv")
                if skips_path.exists():
                    skip_urls = [line.strip() for line in skips_path.read_text(encoding="utf-8").splitlines() if line.strip()]
                    for url in skip_urls:
                        if _run_timed_out(run_deadline):
                            print("Run timeout exceeded. Stopping.")
                            exit_reason = RUN_STATUS_TIMED_OUT
                            exit_error = "run timeout exceeded"
                            _log({"site": "engine", "job_title": "", "company": "", "url": "", "status": STATUS_ERROR, "notes": "run timeout exceeded"})
                            stop_run = True
                            break
                        if reached_cap(counts, daily_cap):
                            print("Daily apply cap reached. Stopping.")
                            stop_run = True
                            break
                        try:
                            page.goto(url, wait_until="domcontentloaded", timeout=NAVIGATION_TIMEOUT_MS)
                            page.wait_for_timeout(1500)
                            target = detect(url, page)
                            skip_adapter = get_adapter(target) if target != "unknown" else None
                            if skip_adapter is not None:
                                if _caps_exceeded(
                                    counts.get(STATUS_APPLIED, 0), per_site_applied, target, daily_cap, per_site_cap
                                ):
                                    continue
                                skip_job = Job(url=url, site=target)
                                try:
                                    result = skip_adapter.apply_to_job(skip_job, cfg, page, ctx)
                                except Exception as e:
                                    print(f"Error processing skip URL {url}: {e}", file=sys.stderr)
                                    _log({
                                        "site": target,
                                        "job_title": "",
                                        "company": "",
                                        "url": url,
                                        "status": STATUS_ERROR,
                                        "notes": str(e)[:180],
                                    })
                                    counts[STATUS_ERROR] = counts.get(STATUS_ERROR, 0) + 1
                                    _sync_run_state()
                                    continue
                                counts[result.status] = counts.get(result.status, 0) + 1
                                if result.status == STATUS_APPLIED and result.site_applied:
                                    per_site_applied[result.site_applied] = per_site_applied.get(result.site_applied, 0) + 1
                                if result.status == STATUS_APPLIED:
                                    _pause_with_jitter(pause_min, pause_max)
                                _sync_run_state()
                            else:
                                _log({
                                    "site": "unknown",
                                    "job_title": "",
                                    "company": "",
                                    "url": url,
                                    "status": STATUS_SKIPPED,
                                    "notes": "unsupported_ats",
                                })
                                counts[STATUS_SKIPPED] = counts.get(STATUS_SKIPPED, 0) + 1
                                _sync_run_state()
                        except Exception as e:
                            print(f"Error processing skip URL {url}: {e}", file=sys.stderr)
                            counts[STATUS_ERROR] = counts.get(STATUS_ERROR, 0) + 1
                            _sync_run_state()
                            continue
                if stop_run:
                    break

    except KeyboardInterrupt:
        exit_reason = RUN_STATUS_CANCELLED
        exit_error = "Interrupted by user."
        print("\nInterrupted by user.")
        return 130
    except Exception as e:
        exit_reason = RUN_STATUS_FAILED
        exit_error = str(e)[:500]
        print(f"Fatal error during execution: {e}", file=sys.stderr)
        return 1
    finally:
        run_state.status = exit_reason
        run_state.finished_at = datetime.now(UTC).isoformat()
        run_state.total_applied = counts.get(STATUS_APPLIED, 0)
        run_state.total_skipped = counts.get(STATUS_SKIPPED, 0)
        run_state.total_error = counts.get(STATUS_ERROR, 0)
        run_state.total_attempted = (
            run_state.total_applied + run_state.total_skipped + run_state.total_error
        )
        if exit_reason in (RUN_STATUS_FAILED, RUN_STATUS_TIMED_OUT, RUN_STATUS_CANCELLED) and exit_error:
            run_state.notes = exit_error
        write_run_state(run_state)
        try:
            browser.close()
            pw.stop()
        except Exception:
            pass

    # Print summary
    storage.print_summary(counts)
    if reached_cap(counts, daily_cap):
        print("Daily apply cap reached for today.")
    return 0
