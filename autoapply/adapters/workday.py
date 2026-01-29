"""Workday job board adapter (experimental).

Implements JobPlatformAdapter for Workday-style ATS job boards (e.g. wd1.myworkdayjobs.com).
Uses conservative selectors; site-specific tuning may be required per tenant.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from autoapply.core.adapters_base import (
    AdapterContext,
    ApplicationResult,
    Job,
    JobPlatformAdapter,
)
from autoapply.core.autofill import click_first_matching
from autoapply.core.browser import NAVIGATION_TIMEOUT_MS
from autoapply.core.config import AppConfig, SearchConfig
from autoapply.core.storage import STATUS_APPLIED, STATUS_ERROR, STATUS_SKIPPED

if TYPE_CHECKING:
    from playwright.sync_api import Page


def _is_workday_url(url: str) -> bool:
    """True if URL appears to be a Workday job board or job page."""
    u = (url or "").lower()
    return "myworkdayjobs.com" in u or ("workday.com" in u and "/wday/" in u)


def _normalize_job_url(href: str | None, base: str) -> str | None:
    """Turn relative or absolute job href into full URL."""
    if not href or not href.strip():
        return None
    href = href.strip()
    if href.startswith("http"):
        return href
    if href.startswith("/"):
        try:
            from urllib.parse import urljoin

            return urljoin(base, href)
        except Exception:
            return None
    return None


class WorkdayAdapter:
    """Workday adapter implementing JobPlatformAdapter. Discovers via job board URL."""

    @property
    def name(self) -> str:
        return "workday"

    def discover_jobs(
        self,
        search_config: SearchConfig,
        config: AppConfig,
        page: "Page",
        ctx: AdapterContext,
    ) -> list[Job]:
        base_url = getattr(search_config, "workday_base_url", None) or ""
        base_url = (base_url or "").strip()
        if not base_url:
            print("[workday] workday_base_url not set; skipping discovery.")
            return []

        try:
            page.goto(
                base_url,
                wait_until="domcontentloaded",
                timeout=NAVIGATION_TIMEOUT_MS,
            )
            if ctx.wait_for_verification:
                ctx.wait_for_verification(page, f"Workday job board: {base_url}")
        except Exception as e:  # noqa: BLE001
            print(f"[workday] Failed to open job board {base_url}: {e}")
            return []

        page.wait_for_timeout(3000)  # Allow XHR to load job listings

        jobs: list[Job] = []
        seen: set[str] = set()

        # TODO: Workday DOM varies by tenant. Tune selectors per deployment.
        # Common patterns: a[href*="/job/"], [data-automation-id*="job"], li roles.
        selectors = [
            "a[href*='/job/']",
            "a[href*='/jobs/']",
            '[data-automation-id*="jobTitle"]',
            '[data-automation-id*="compositeContainer"] a[href]',
        ]
        for sel in selectors:
            try:
                locators = page.locator(sel).all()
                for loc in locators[:100]:
                    try:
                        href = loc.get_attribute("href")
                        url = _normalize_job_url(href, base_url)
                        if not url or url in seen:
                            continue
                        if not _is_workday_url(url):
                            continue
                        seen.add(url)
                        title = ""
                        company = ""
                        try:
                            title = (loc.inner_text(timeout=1000) or "").strip()[:200]
                        except Exception:
                            pass
                        jobs.append(
                            Job(
                                url=url,
                                title=title,
                                company=company,
                                site="workday",
                                search_name=search_config.name or "",
                            )
                        )
                    except Exception:
                        continue
                if jobs:
                    break
            except Exception:
                continue

        print(f"[workday] {search_config.name or 'search'} -> {len(jobs)} jobs from {base_url}")
        return jobs

    def apply_to_job(
        self,
        job: Job,
        config: AppConfig,
        page: "Page",
        ctx: AdapterContext,
    ) -> ApplicationResult:
        job_url = job.url
        title = job.title or ""
        company = job.company or ""

        try:
            page.goto(
                job_url,
                wait_until="domcontentloaded",
                timeout=NAVIGATION_TIMEOUT_MS,
            )
            if ctx.wait_for_verification:
                ctx.wait_for_verification(page, f"Workday job: {job_url}")
        except Exception as e:  # noqa: BLE001
            entry = {
                "site": "workday",
                "job_title": title,
                "company": company,
                "url": job_url,
                "status": STATUS_ERROR,
                "notes": f"navigation error: {str(e)[:140]}",
                "search_name": job.search_name,
            }
            ctx.log(entry)
            ctx.save_artifacts(page, STATUS_ERROR)
            return ApplicationResult(status=STATUS_ERROR, notes=str(e)[:140])

        page.wait_for_timeout(2000)

        if not _is_workday_url(page.url):
            entry = {
                "site": "workday",
                "job_title": title,
                "company": company,
                "url": job_url,
                "status": STATUS_ERROR,
                "notes": "not_a_workday_page",
                "search_name": job.search_name,
            }
            ctx.log(entry)
            ctx.save_artifacts(page, STATUS_ERROR)
            return ApplicationResult(status=STATUS_ERROR, notes="not_a_workday_page")

        # TODO: Workday apply flow varies. Tune selectors per tenant.
        # Check for complex signup wall (Create account, Sign in as primary CTA) -> skip.
        try:
            signin = page.get_by_role("link", name="Sign in")
            if signin.count() > 0 and signin.first.is_visible():
                create = page.get_by_role("link", name="Create account")
                if create.count() > 0 and create.first.is_visible():
                    entry = {
                        "site": "workday",
                        "job_title": title,
                        "company": company,
                        "url": job_url,
                        "status": STATUS_SKIPPED,
                        "notes": "complex account signup beyond scope",
                        "search_name": job.search_name,
                    }
                    ctx.log(entry)
                    ctx.save_artifacts(page, STATUS_SKIPPED)
                    return ApplicationResult(
                        status=STATUS_SKIPPED,
                        notes="complex account signup beyond scope",
                    )
        except Exception:
            pass

        if ctx.dry_run:
            entry = {
                "site": "workday",
                "job_title": title,
                "company": company,
                "url": job_url,
                "status": STATUS_SKIPPED,
                "notes": "dry_run",
                "search_name": job.search_name,
            }
            ctx.log(entry)
            ctx.save_artifacts(page, STATUS_SKIPPED)
            return ApplicationResult(status=STATUS_SKIPPED, notes="dry_run")

        # Try to find and click Apply.
        applied = click_first_matching(
            page,
            ["Apply", "Apply Now", "Apply for this job", "Submit application", "Apply for Job"],
        )
        if not applied:
            entry = {
                "site": "workday",
                "job_title": title,
                "company": company,
                "url": job_url,
                "status": STATUS_SKIPPED,
                "notes": "apply button not found",
                "search_name": job.search_name,
            }
            ctx.log(entry)
            ctx.save_artifacts(page, STATUS_SKIPPED)
            return ApplicationResult(status=STATUS_SKIPPED, notes="apply button not found")

        page.wait_for_timeout(2500)

        # Check for confirmation (thank you, application submitted, etc.).
        # TODO: Workday confirmation patterns vary; tune per tenant.
        confirm_selectors = [
            "text=/thank you/i",
            "text=/application submitted/i",
            "text=/application received/i",
            "text=/you applied/i",
            "[data-automation-id*='success']",
        ]
        for sel in confirm_selectors:
            try:
                el = page.locator(sel)
                if el.count() > 0 and el.first.is_visible():
                    entry = {
                        "site": "workday",
                        "job_title": title,
                        "company": company,
                        "url": job_url,
                        "status": STATUS_APPLIED,
                        "notes": "",
                        "search_name": job.search_name,
                    }
                    ctx.log(entry)
                    ctx.save_artifacts(page, STATUS_APPLIED)
                    return ApplicationResult(
                        status=STATUS_APPLIED,
                        notes="",
                        site_applied="workday",
                    )
            except Exception:
                continue

        # No confirmation found; likely multi-step form or different flow.
        entry = {
            "site": "workday",
            "job_title": title,
            "company": company,
            "url": job_url,
            "status": STATUS_ERROR,
            "notes": "DOM does not match expectations; no confirmation detected",
            "search_name": job.search_name,
        }
        ctx.log(entry)
        ctx.save_artifacts(page, STATUS_ERROR)
        return ApplicationResult(
            status=STATUS_ERROR,
            notes="DOM does not match expectations; no confirmation detected",
        )
