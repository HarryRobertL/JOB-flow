"""Indeed job application adapter."""

import json
import random
import re
import time
from time import sleep
from typing import Callable
from urllib.parse import urlencode

from playwright.sync_api import Error

from autoapply.adapters import greenhouse, lever
from autoapply.adapters.greenhouse import GreenhouseAdapter
from autoapply.adapters.lever import LeverAdapter
from autoapply.core.adapters_base import (
    AdapterContext,
    ApplicationResult,
    Job,
    JobPlatformAdapter,
)
from autoapply.core.autofill import (
    fill_text,
    upload_file,
    click_first_matching,
    tick_checkbox_or_radio,
    fill_by_name,
)
from autoapply.core.browser import NAVIGATION_TIMEOUT_MS
from autoapply.core.browser_utils import wait_for_cloudflare_clear
from autoapply.core.config import AppConfig, SearchConfig
from autoapply.core.router import detect
from autoapply.core.storage import (
    DEFAULT_LOGS_PATH,
    STATUS_APPLIED,
    STATUS_ERROR,
    STATUS_SKIPPED,
    log,
    save_artifacts,
)

BASE = "https://uk.indeed.com/jobs"


def _build_sc(remote=None, easy_apply=False):
    """Build Indeed search criteria parameter."""
    attrs = []
    if remote:
        attrs.append(f"attr({remote})")
    if easy_apply:
        attrs.append("attr(DSQF7)")
    if not attrs:
        return None
    encoded = "%3B".join(attrs)
    return f"0kf%3A{encoded}%3B"


def search_url(query: str, location: str, radius_km: int = 25, easy_apply: bool = True) -> str:
    """
    Build an Indeed search URL.

    Args:
        query: Job search query
        location: Location string
        radius_km: Search radius in kilometers
        easy_apply: Whether to filter for Easy Apply jobs

    Returns:
        Complete Indeed search URL
    """
    params = {"q": query, "l": location, "radius": radius_km}
    sc = _build_sc(remote=None, easy_apply=easy_apply)
    if sc:
        params["sc"] = sc
    return f"{BASE}?{urlencode(params)}"


def _bump(counts: dict | None, status: str) -> None:
    """Increment a status counter."""
    if counts is None:
        return
    counts[status] = counts.get(status, 0) + 1


def _at_cap(counts: dict | None, daily_cap: int | None) -> bool:
    """Check if daily apply cap has been reached."""
    if not daily_cap or counts is None:
        return False
    return counts.get(STATUS_APPLIED, 0) >= daily_cap


def _pause_with_jitter(pause_min: float, pause_max: float) -> None:
    """Sleep for a random duration in [pause_min, pause_max] with small jitter."""
    base = random.uniform(pause_min, pause_max)
    jitter = random.uniform(-0.5, 0.5)
    duration = max(0.0, base + jitter)
    if duration > 0:
        sleep(duration)


def _normalized_href(href: str | None) -> str | None:
    """Normalize a relative or absolute URL."""
    if not href:
        return None
    if href.startswith("http"):
        return href
    if href.startswith("/"):
        return f"https://uk.indeed.com{href}"
    return None


def _navigate_with_retries(
    page,
    url: str,
    wait_for_verification: Callable[[object, str], None] | None = None,
    label: str | None = None,
    attempts: int = 3,
) -> None:
    """Navigate to a URL with retry logic. Uses NAVIGATION_TIMEOUT_MS for goto."""
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=NAVIGATION_TIMEOUT_MS)
            if wait_for_verification:
                wait_for_verification(page, label or url)
            return
        except TimeoutError as exc:
            last_error = exc
            print(f"Navigation timeout to {label or url} (attempt {attempt}/{attempts})")
            page.wait_for_timeout(2000 * attempt)
        except Error as exc:
            last_error = exc
            if "timeout" in str(exc).lower() or "exceeded" in str(exc).lower():
                print(f"Navigation timeout to {label or url} (attempt {attempt}/{attempts})")
            else:
                print(f"Navigation to {label or url} failed (attempt {attempt}/{attempts}): {exc}")
            page.wait_for_timeout(2000 * attempt)
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            print(f"Navigation to {label or url} failed (attempt {attempt}/{attempts}): {exc}")
            page.wait_for_timeout(2000 * attempt)
    if last_error:
        raise last_error


def _application_context(page):
    """Find the application iframe context."""
    # Prefer a visible apply iframe by semantic attributes
    try:
        frame = page.frame_locator("iframe[title*='apply'], iframe[aria-label*='apply']").first
        if frame and frame.frame:
            return frame.frame
    except Exception:
        pass
    # Fallback: any non-main frame containing form controls
    try:
        for fr in page.frames:
            if fr == page.main_frame:
                continue
            try:
                if fr.locator("input, textarea, select, button").count() > 0:
                    return fr
            except Exception:
                continue
    except Exception:
        pass
    return page


def _description_text(context):
    """Extract job description text."""
    try:
        return (
            context.locator("#jobDescriptionText, .jobsearch-jobDescriptionText")
            .first.inner_text(timeout=4000)
        )
    except Exception:
        return ""


def _matches_filters(title: str, description: str, filters: dict | None) -> tuple[bool, str]:
    """Check if a job matches the configured filters."""
    if not filters:
        return True, ""

    title_terms = [t.lower() for t in filters.get("titles_include", [])]
    keyword_terms = [k.lower() for k in filters.get("keywords_include", [])]

    lowered_title = (title or "").lower()
    combined = f"{title}\n{description}".lower()

    if title_terms:
        if not any(term in lowered_title for term in title_terms):
            return False, "title not in whitelist"
    if keyword_terms:
        if not any(term in combined for term in keyword_terms):
            return False, "keywords not matched"
    return True, ""


def _extract_job_info(page):
    """Extract job title and company from the page."""
    title = ""
    company = ""
    try:
        title = page.locator("h1, h2.jobTitle").first.inner_text(timeout=5000)
    except Exception:
        pass
    try:
        company = (
            page.locator("[data-company-name], .jobsearch-InlineCompanyRating div, .companyName")
            .first.inner_text(timeout=5000)
        )
    except Exception:
        pass
    return title, company


def _submission_succeeded(app_ctx, page) -> tuple[bool, dict]:
    """Check if application submission was successful."""
    selectors = [
        ("div[data-testid='ia-apply-success-message']", "success_banner"),
        ("div[role='alert'] :text-matches('(?i)submitted|application sent|thank you')", "alert_text"),
        ("[data-testid='ia-apply-success-message']", "success_banner"),
        ("[aria-live='polite'] :text-matches('(?i)submitted|sent|thank you')", "live_region"),
        ("text=/Thanks for applying/i", "text"),
        ("text=/application submitted/i", "text"),
        ("text=/application sent/i", "text"),
        ("text=/you applied/i", "text"),
        ("text=/your application has been submitted/i", "text"),
    ]
    for ctx in (app_ctx, page):
        for sel, kind in selectors:
            try:
                locator = ctx.locator(sel).first
                try:
                    locator.wait_for(state="visible", timeout=6000)
                except Exception:
                    try:
                        if not locator.is_visible(timeout=2000):
                            continue
                    except Exception:
                        continue
                snippet = ""
                try:
                    snippet = locator.inner_text(timeout=2000)[:240]
                except Exception:
                    pass
                return True, {"selector": sel, "type": kind, "snippet": snippet}
            except Exception:
                continue
    return False, {}


def _fill_indeed_application(app_ctx, cfg: AppConfig) -> None:
    """Fill out an Indeed Easy Apply application form."""
    # Basic identity fields
    fill_text(app_ctx, "First name", cfg.account.first_name)
    fill_text(app_ctx, "Last name", cfg.account.last_name)
    fill_text(app_ctx, "Email", cfg.account.email)
    fill_text(app_ctx, "Phone", cfg.account.phone)

    # Address / location fallbacks
    if cfg.account.postcode:
        fill_text(app_ctx, "Postcode", cfg.account.postcode)
        fill_by_name(app_ctx, "postcode", cfg.account.postcode)
        fill_by_name(app_ctx, "zip", cfg.account.postcode)
        fill_by_name(app_ctx, "postalCode", cfg.account.postcode)
    if cfg.account.city:
        fill_text(app_ctx, "City", cfg.account.city)
    if cfg.account.address:
        fill_text(app_ctx, "Address", cfg.account.address)

    # Common right-to-work / consent toggles
    tick_checkbox_or_radio(
        app_ctx,
        "I have the right to work in the UK",
    )
    tick_checkbox_or_radio(
        app_ctx,
        "I certify that the information provided is true",
    )
    tick_checkbox_or_radio(
        app_ctx,
        "I agree to the privacy policy",
    )

    # Upload CV
    cv_path = cfg.defaults.cv_path
    if cv_path:
        upload_file(app_ctx, cv_path)

    # Custom answers from config
    cfg_dict = cfg.to_dict()
    if cfg_dict.get("answers"):
        for label, value in cfg_dict["answers"].items():
            fill_text(app_ctx, label.replace("_", " "), str(value))

    # Force fill identity fields with multiple selector attempts
    _force_identity_fields(app_ctx, cfg_dict)


def _force_identity_fields(ctx, cfg_dict):
    """Force fill identity fields with multiple selector attempts."""
    def _force(selectors, value):
        for sel in selectors:
            try:
                field = ctx.locator(sel)
                if field.count() == 0:
                    continue
                field.first.fill(value)
                return True
            except Exception:
                continue
        return False

    _force(
        [
            "input[name='firstName']",
            "input[name='applicant.firstName']",
            "input[id*='first'][type='text']",
            "input[autocomplete='given-name']",
        ],
        cfg_dict["account"]["first_name"],
    )
    _force(
        [
            "input[name='lastName']",
            "input[name='applicant.lastName']",
            "input[id*='last'][type='text']",
            "input[autocomplete='family-name']",
        ],
        cfg_dict["account"]["last_name"],
    )
    _force(
        [
            "input[name='email']",
            "input[name='applicant.email']",
            "input[type='email']",
        ],
        cfg_dict["account"]["email"],
    )
    _force(
        [
            "input[name='phone']",
            "input[name='applicant.phone']",
            "input[autocomplete='tel']",
            "input[type='tel']",
        ],
        cfg_dict["account"]["phone"],
    )


def _run_timed_out(deadline: float) -> bool:
    return time.monotonic() >= deadline


class IndeedAdapter:
    """Indeed adapter implementing JobPlatformAdapter. Discovers via search; applies or delegates to GH/Lever."""

    @property
    def name(self) -> str:
        return "indeed"

    def discover_jobs(
        self,
        search_config: SearchConfig,
        config: AppConfig,
        page,
        ctx: AdapterContext,
    ) -> list[Job]:
        url = search_url(
            search_config.query,
            search_config.location,
            radius_km=search_config.radius_km,
            easy_apply=search_config.easy_apply,
        )
        try:
            _navigate_with_retries(
                page,
                url,
                wait_for_verification=ctx.wait_for_verification,
                label=f"Indeed search: {search_config.query} @ {search_config.location}",
            )
        except Exception as nav_err:  # noqa: BLE001
            print(f"[indeed] Failed to open search results {url}: {nav_err}")
            return []

        page.wait_for_timeout(1500)
        hrefs: list[str] = []
        max_pages = 5
        page_num = 0

        while page_num < max_pages:
            card_locators = page.locator("a.tapItem, a.jcs-JobTitle, a[data-jk]").all()[:80]
            page_hrefs: list[str] = []
            for card in card_locators:
                try:
                    href = _normalized_href(card.get_attribute("href"))
                    if href and href not in hrefs:
                        if any(d in href for d in ("indeed.com/cmp", "indeed.com/companies")):
                            continue
                        page_hrefs.append(href)
                except Exception:
                    continue
            hrefs.extend(page_hrefs)
            print(f"[indeed] Page {page_num + 1}: {len(page_hrefs)} new jobs")
            if page_num < max_pages - 1:
                try:
                    next_btn = page.locator("a[aria-label='Next Page'], a[data-testid='pagination-page-next']").first
                    if next_btn.count() > 0 and next_btn.is_visible():
                        next_btn.click()
                        page.wait_for_timeout(2000)
                        page_num += 1
                        continue
                except Exception:
                    pass
            break

        print(f"[indeed] {search_config.query} @ {search_config.location} -> {len(hrefs)} total jobs across {page_num + 1} page(s)")
        return [
            Job(url=h, site="indeed", search_name=search_config.name or "")
            for h in hrefs
        ]

    def apply_to_job(
        self,
        job: Job,
        config: AppConfig,
        page,
        ctx: AdapterContext,
    ) -> ApplicationResult:
        app_ctx = None
        title = ""
        company = ""
        job_url = job.url

        def _log_entry(entry: dict) -> None:
            ctx.log(entry)
            ctx.save_artifacts(app_ctx if app_ctx else page, entry.get("status", ""))

        try:
            try:
                _navigate_with_retries(
                    page,
                    job.url,
                    wait_for_verification=ctx.wait_for_verification,
                    label=f"Indeed job detail: {job.url}",
                )
            except Exception as nav_err:  # noqa: BLE001
                entry = {
                    "site": "indeed",
                    "job_title": "",
                    "company": "",
                    "url": job.url,
                    "status": STATUS_ERROR,
                    "notes": f"navigation error: {str(nav_err)[:140]}",
                    "search_name": job.search_name,
                }
                _log_entry(entry)
                return ApplicationResult(status=STATUS_ERROR, notes=entry["notes"])

            page.wait_for_timeout(1200)
            title, company = _extract_job_info(page)
            job_url = page.url
            description = _description_text(page)
            filters = config.filters.model_dump() if config.filters else {}
            matches, reason = _matches_filters(title, description, filters)
            if not matches:
                entry = {
                    "site": "indeed",
                    "job_title": title,
                    "company": company,
                    "url": job_url,
                    "status": STATUS_SKIPPED,
                    "notes": reason,
                    "search_name": job.search_name,
                }
                _log_entry(entry)
                return ApplicationResult(status=STATUS_SKIPPED, notes=reason)

            if not click_first_matching(page, ["Apply now", "Quick apply", "Easily apply", "Apply on Indeed"]):
                entry = {
                    "site": "indeed",
                    "job_title": title,
                    "company": company,
                    "url": job_url,
                    "status": STATUS_SKIPPED,
                    "notes": "no easy apply",
                    "search_name": job.search_name,
                }
                _log_entry(entry)
                return ApplicationResult(status=STATUS_SKIPPED, notes="no easy apply")

            page.wait_for_timeout(1500)
            app_ctx = _application_context(page)
            current_url = getattr(app_ctx, "url", page.url)
            if current_url and "indeed.com" not in current_url:
                detected = detect(current_url, page)
                if detected == "greenhouse":
                    psa = ctx.per_site_applied or {}
                    cap = ctx.per_site_cap or 0
                    if cap > 0 and psa.get("greenhouse", 0) >= cap:
                        entry = {
                            "site": "indeed",
                            "job_title": title,
                            "company": company,
                            "url": current_url,
                            "status": STATUS_SKIPPED,
                            "notes": "greenhouse per-site cap reached",
                            "search_name": job.search_name,
                        }
                        _log_entry(entry)
                        return ApplicationResult(status=STATUS_SKIPPED, notes="greenhouse per-site cap reached")
                    delegate_job = Job(url=current_url, title=title, company=company, site="greenhouse", search_name=job.search_name)
                    res = GreenhouseAdapter().apply_to_job(delegate_job, config, page, ctx)
                    return res
                if detected == "lever":
                    psa = ctx.per_site_applied or {}
                    cap = ctx.per_site_cap or 0
                    if cap > 0 and psa.get("lever", 0) >= cap:
                        entry = {
                            "site": "indeed",
                            "job_title": title,
                            "company": company,
                            "url": current_url,
                            "status": STATUS_SKIPPED,
                            "notes": "lever per-site cap reached",
                            "search_name": job.search_name,
                        }
                        _log_entry(entry)
                        return ApplicationResult(status=STATUS_SKIPPED, notes="lever per-site cap reached")
                    delegate_job = Job(url=current_url, title=title, company=company, site="lever", search_name=job.search_name)
                    res = LeverAdapter().apply_to_job(delegate_job, config, page, ctx)
                    return res
                entry = {
                    "site": "indeed",
                    "job_title": title,
                    "company": company,
                    "url": current_url,
                    "status": STATUS_SKIPPED,
                    "notes": "unsupported_ats",
                    "search_name": job.search_name,
                }
                _log_entry(entry)
                return ApplicationResult(status=STATUS_SKIPPED, notes="unsupported_ats")

            _fill_indeed_application(app_ctx, config)
            for _ in range(8):
                if click_first_matching(app_ctx, ["Continue", "Next", "Review", "Proceed", "Confirm"]):
                    page.wait_for_timeout(900)
                    app_ctx = _application_context(page)
                else:
                    break

            if ctx.dry_run:
                entry = {
                    "site": "indeed",
                    "job_title": title,
                    "company": company,
                    "url": job_url,
                    "status": STATUS_SKIPPED,
                    "notes": "dry_run",
                    "search_name": job.search_name,
                }
                _log_entry(entry)
                return ApplicationResult(status=STATUS_SKIPPED, notes="dry_run")

            if click_first_matching(app_ctx, ["Submit application", "Apply", "Finish"]):
                page.wait_for_timeout(1500)
                success, confirmation = _submission_succeeded(app_ctx, page)
                if success:
                    snippet = json.dumps(confirmation) if confirmation else ""
                    entry = {
                        "site": "indeed",
                        "job_title": title,
                        "company": company,
                        "url": job_url,
                        "status": STATUS_APPLIED,
                        "notes": snippet,
                        "search_name": job.search_name,
                    }
                    _log_entry(entry)
                    return ApplicationResult(status=STATUS_APPLIED, notes=snippet, site_applied="indeed")
                entry = {
                    "site": "indeed",
                    "job_title": title,
                    "company": company,
                    "url": job_url,
                    "status": STATUS_SKIPPED,
                    "notes": "no submission confirmation",
                    "search_name": job.search_name,
                }
                _log_entry(entry)
                return ApplicationResult(status=STATUS_SKIPPED, notes="no submission confirmation")
            entry = {
                "site": "indeed",
                "job_title": title,
                "company": company,
                "url": job_url,
                "status": STATUS_SKIPPED,
                "notes": "submit button not found",
                "search_name": job.search_name,
            }
            _log_entry(entry)
            return ApplicationResult(status=STATUS_SKIPPED, notes="submit button not found")

        except Exception as e:  # noqa: BLE001
            entry = {
                "site": "indeed",
                "job_title": title,
                "company": company,
                "url": job_url,
                "status": STATUS_ERROR,
                "notes": str(e)[:180],
                "search_name": job.search_name,
            }
            _log_entry(entry)
            return ApplicationResult(status=STATUS_ERROR, notes=str(e)[:180])


def run_search(
    page,
    cfg: AppConfig,
    search_cfg: SearchConfig,
    counts: dict | None = None,
    per_site_applied: dict | None = None,
    daily_cap: int = 60,
    per_site_cap: int = 40,
    run_deadline: float = 0.0,
    dry_run: bool = False,
    log_path: str = DEFAULT_LOGS_PATH,
    run_id: str = "",
    claimant_id: str = "",
    wait_for_verification: Callable[[object, str], None] | None = None,
) -> dict:
    """
    Run an Indeed job search and apply to matching jobs.

    Args:
        page: Playwright page object
        cfg: Application configuration
        search_cfg: Search configuration
        counts: Dictionary to track application counts
        per_site_applied: Mutable dict of applied count per site (updated on applied)
        daily_cap: Global daily apply cap
        per_site_cap: Global per-site apply cap
        run_deadline: Monotonic deadline; stop if exceeded
        dry_run: If True, stop before final submit
        log_path: Path to log CSV file
        run_id: Run identifier for this execution
        claimant_id: Optional claimant identifier
        wait_for_verification: Optional callback for Cloudflare verification

    Returns:
        Updated counts dictionary
    """
    if counts is None:
        counts = {}
    if per_site_applied is None:
        per_site_applied = {}

    # Build search URL
    url = search_url(
        search_cfg.query,
        search_cfg.location,
        radius_km=search_cfg.radius_km,
        easy_apply=search_cfg.easy_apply,
    )

    # Navigate to search results
    try:
        _navigate_with_retries(
            page,
            url,
            wait_for_verification=wait_for_verification,
            label=f"Indeed search: {search_cfg.query} @ {search_cfg.location}",
        )
    except Exception as nav_err:  # noqa: BLE001
        print(f"[indeed] Failed to open search results {url}: {nav_err}")
        return counts

    page.wait_for_timeout(1500)

    # Collect all job URLs from all pages (with pagination)
    hrefs = []
    max_pages = 5  # Limit pagination to avoid infinite loops
    page_num = 0

    while page_num < max_pages:
        # Extract job cards from current page
        card_locators = page.locator("a.tapItem, a.jcs-JobTitle, a[data-jk]").all()[:80]
        page_hrefs = []
        for card in card_locators:
            try:
                href = _normalized_href(card.get_attribute("href"))
                if href:
                    # Skip company pages
                    if any(domain in href for domain in ("indeed.com/cmp", "indeed.com/companies")):
                        continue
                    if href not in hrefs:  # Avoid duplicates
                        page_hrefs.append(href)
            except Exception:
                continue

        hrefs.extend(page_hrefs)
        print(f"[indeed] Page {page_num + 1}: {len(page_hrefs)} new jobs")

        # Try to go to next page
        if page_num < max_pages - 1:
            try:
                next_button = page.locator("a[aria-label='Next Page'], a[data-testid='pagination-page-next']").first
                if next_button.count() > 0 and next_button.is_visible():
                    next_button.click()
                    page.wait_for_timeout(2000)
                    page_num += 1
                    continue
            except Exception:
                pass

        # No next page found, break
        break

    print(f"[indeed] {search_cfg.query} @ {search_cfg.location} -> {len(hrefs)} total jobs across {page_num + 1} page(s)")

    # Get pause range
    pause_range = search_cfg.pause_between_apps_seconds
    if pause_range is None:
        # Fallback to config limits
        limits = cfg.to_dict().get("limits", {})
        pause_range = limits.get("pause_between_apps_seconds", [6, 18])
    if isinstance(pause_range, (list, tuple)) and len(pause_range) >= 2:
        pause_min, pause_max = pause_range[0], pause_range[1]
    else:
        pause_min, pause_max = 6, 18

    applied_count = 0
    filters = cfg.filters.model_dump() if cfg.filters else {}
    site_key = "indeed"

    for href in hrefs:
        if run_deadline > 0 and _run_timed_out(run_deadline):
            break
        if _at_cap(counts, daily_cap):
            break
        if per_site_applied.get(site_key, 0) >= per_site_cap:
            break

        app_ctx = None
        title = ""
        company = ""
        job_url = href

        try:
            # Navigate to job detail page
            try:
                _navigate_with_retries(
                    page,
                    href,
                    wait_for_verification=wait_for_verification,
                    label=f"Indeed job detail: {href}",
                )
            except Exception as nav_err:  # noqa: BLE001
                result = log(
                    log_path,
                    {
                        "site": "indeed",
                        "job_title": "",
                        "company": "",
                        "url": href,
                        "status": STATUS_ERROR,
                        "notes": f"navigation error: {str(nav_err)[:140]}",
                        "search_name": search_cfg.name,
                    },
                    run_id=run_id,
                    claimant_id=claimant_id,
                )
                save_artifacts(page, result["status"])
                _bump(counts, result["status"])
                continue

            page.wait_for_timeout(1200)

            # Extract job info
            title, company = _extract_job_info(page)
            job_url = page.url

            # Get description for filtering
            description = _description_text(page)

            # Apply filters
            matches, reason = _matches_filters(title, description, filters)
            if not matches:
                result = log(
                    log_path,
                    {
                        "site": "indeed",
                        "job_title": title,
                        "company": company,
                        "url": job_url,
                        "status": STATUS_SKIPPED,
                        "notes": reason,
                        "search_name": search_cfg.name,
                    },
                    run_id=run_id,
                    claimant_id=claimant_id,
                )
                save_artifacts(page, result["status"])
                _bump(counts, result["status"])
                continue

            # Try to click Apply button
            if not click_first_matching(page, ["Apply now", "Quick apply", "Easily apply", "Apply on Indeed"]):
                result = log(
                    log_path,
                    {
                        "site": "indeed",
                        "job_title": title,
                        "company": company,
                        "url": job_url,
                        "status": STATUS_SKIPPED,
                        "notes": "no easy apply",
                        "search_name": search_cfg.name,
                    },
                    run_id=run_id,
                    claimant_id=claimant_id,
                )
                save_artifacts(page, result["status"])
                _bump(counts, result["status"])
                continue

            # Wait for application form to load
            page.wait_for_timeout(1500)
            app_ctx = _application_context(page)

            # Check if we were redirected to external ATS
            current_url = getattr(app_ctx, "url", page.url)
            if current_url and "indeed.com" not in current_url:
                # Detect if it's Greenhouse or Lever
                detected = detect(current_url, page)
                if detected == "greenhouse":
                    if per_site_applied.get("greenhouse", 0) >= per_site_cap:
                        continue
                    greenhouse.apply(
                        page, cfg, counts=counts, logs=log_path,
                        run_id=run_id, claimant_id=claimant_id,
                        per_site_applied=per_site_applied,
                    )
                    continue
                elif detected == "lever":
                    if per_site_applied.get("lever", 0) >= per_site_cap:
                        continue
                    lever.apply(
                        page, cfg, counts=counts, logs=log_path,
                        run_id=run_id, claimant_id=claimant_id,
                        per_site_applied=per_site_applied,
                    )
                    continue
                else:
                    result = log(
                        log_path,
                        {
                            "site": "indeed",
                            "job_title": title,
                            "company": company,
                            "url": current_url,
                            "status": STATUS_SKIPPED,
                            "notes": "unsupported_ats",
                            "search_name": search_cfg.name,
                        },
                        run_id=run_id,
                        claimant_id=claimant_id,
                    )
                    save_artifacts(page, result["status"])
                    _bump(counts, result["status"])
                    continue

            # Fill out Indeed Easy Apply form
            _fill_indeed_application(app_ctx, cfg)

            # Progress through multi-step forms
            for _ in range(8):
                if click_first_matching(app_ctx, ["Continue", "Next", "Review", "Proceed", "Confirm"]):
                    page.wait_for_timeout(900)
                    app_ctx = _application_context(page)
                else:
                    break

            # Handle dry run
            if dry_run:
                result = log(
                    log_path,
                    {
                        "site": "indeed",
                        "job_title": title,
                        "company": company,
                        "url": job_url,
                        "status": STATUS_SKIPPED,
                        "notes": "dry_run",
                        "search_name": search_cfg.name,
                    },
                    run_id=run_id,
                    claimant_id=claimant_id,
                )
                save_artifacts(app_ctx if app_ctx else page, result["status"])
                _bump(counts, result["status"])
                continue

            # Submit application
            if click_first_matching(app_ctx, ["Submit application", "Apply", "Finish"]):
                page.wait_for_timeout(1500)
                success, confirmation = _submission_succeeded(app_ctx, page)
                if success:
                    result = log(
                        log_path,
                        {
                            "site": "indeed",
                            "job_title": title,
                            "company": company,
                            "url": job_url,
                            "status": STATUS_APPLIED,
                            "notes": json.dumps(confirmation) if confirmation else "",
                            "search_name": search_cfg.name,
                        },
                        run_id=run_id,
                        claimant_id=claimant_id,
                    )
                    save_artifacts(app_ctx if app_ctx else page, result["status"])
                    _bump(counts, result["status"])
                    applied_count += 1
                    per_site_applied[site_key] = per_site_applied.get(site_key, 0) + 1
                else:
                    result = log(
                        log_path,
                        {
                            "site": "indeed",
                            "job_title": title,
                            "company": company,
                            "url": job_url,
                            "status": STATUS_SKIPPED,
                            "notes": "no submission confirmation",
                            "search_name": search_cfg.name,
                        },
                        run_id=run_id,
                        claimant_id=claimant_id,
                    )
                    save_artifacts(app_ctx if app_ctx else page, result["status"])
                    _bump(counts, result["status"])
            else:
                result = log(
                    log_path,
                    {
                        "site": "indeed",
                        "job_title": title,
                        "company": company,
                        "url": job_url,
                        "status": STATUS_SKIPPED,
                        "notes": "submit button not found",
                        "search_name": search_cfg.name,
                    },
                    run_id=run_id,
                    claimant_id=claimant_id,
                )
                save_artifacts(app_ctx if app_ctx else page, result["status"])
                _bump(counts, result["status"])

            if applied_count > 0:
                _pause_with_jitter(float(pause_min), float(pause_max))

        except Exception as e:
            result = log(
                log_path,
                {
                    "site": "indeed",
                    "job_title": title,
                    "company": company,
                    "url": job_url,
                    "status": STATUS_ERROR,
                    "notes": str(e)[:180],
                    "search_name": search_cfg.name,
                },
                run_id=run_id,
                claimant_id=claimant_id,
            )
            save_artifacts(app_ctx if app_ctx else page, result["status"])
            _bump(counts, result["status"])

    return counts
