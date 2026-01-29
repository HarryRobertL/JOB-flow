"""Lever job application adapter."""

from pathlib import Path
from typing import TYPE_CHECKING

from autoapply.core.adapters_base import (
    AdapterContext,
    ApplicationResult,
    Job,
    JobPlatformAdapter,
)
from autoapply.core.autofill import (
    click_first_matching,
    fill_text,
    tick_checkbox_or_radio,
    upload_file,
)
from autoapply.core.config import AppConfig, SearchConfig
from autoapply.core.storage import STATUS_APPLIED, STATUS_ERROR, log

if TYPE_CHECKING:
    from playwright.sync_api import Page


def is_lever(page: "Page") -> bool:
    """Check if the current page is a Lever application form."""
    try:
        url = page.url.lower()
        if "lever.co" in url:
            return True
    except Exception:
        pass
    try:
        if page.locator("form[name='application']").count() > 0:
            return True
    except Exception:
        pass
    return False


def _bump(counts: dict | None, status: str) -> None:
    """Increment a status counter."""
    if counts is None:
        return
    counts[status] = counts.get(status, 0) + 1


def _extract_job_info(page: "Page") -> tuple[str, str]:
    """Extract job title and company from the page."""
    title = ""
    company = ""
    
    # Try various selectors for job title
    title_selectors = [
        "h2[itemprop='title']",
        "h1",
        "[data-testid='job-title']",
        ".posting-title",
        ".posting-headline h2",
    ]
    for selector in title_selectors:
        try:
            locator = page.locator(selector).first
            if locator.count() > 0:
                title = locator.inner_text(timeout=2000).strip()
                if title:
                    break
        except Exception:
            continue
    
    # Try various selectors for company
    company_selectors = [
        "[itemprop='hiringOrganization']",
        ".posting-company-name",
        ".company-name",
        "h3.company-name",
    ]
    for selector in company_selectors:
        try:
            locator = page.locator(selector).first
            if locator.count() > 0:
                company = locator.inner_text(timeout=2000).strip()
                if company:
                    break
        except Exception:
            continue
    
    return title, company


def _handle_yes_no_questions(page: "Page") -> None:
    """Handle generic yes/no questions by ticking the first sensible option."""
    # Common yes/no question patterns
    yes_no_patterns = [
        "Do you have the right to work",
        "Are you authorized to work",
        "Can you work legally",
        "Do you require sponsorship",
        "Are you willing to relocate",
        "Do you agree to the terms",
        "Do you consent",
    ]
    
    # Look for labels containing these patterns
    try:
        labels = page.locator("label")
        count = labels.count()
        for i in range(min(count, 50)):  # Limit to first 50 to avoid performance issues
            try:
                label_elem = labels.nth(i)
                label_text = label_elem.inner_text().lower()
                
                # Check if this label matches any yes/no pattern
                for pattern in yes_no_patterns:
                    if pattern.lower() in label_text:
                        # Try to tick the first "Yes" option if available
                        try:
                            parent = label_elem.locator("..")
                            yes_options = parent.locator("input[type='radio'][value*='yes'], input[type='radio'][value*='Yes']")
                            if yes_options.count() > 0:
                                yes_options.first.check()
                                break
                            # Otherwise, just tick the first option
                            radio = label_elem.locator("input[type='radio']").first
                            if radio.count() > 0:
                                radio.check()
                                break
                        except Exception:
                            pass
            except Exception:
                continue
    except Exception:
        pass


def apply(
    page: "Page",
    cfg: AppConfig,
    counts: dict | None = None,
    logs: str | Path = "data/logs.csv",
    run_id: str = "",
    claimant_id: str = "",
    per_site_applied: dict | None = None,
) -> dict | None:
    """
    Apply to a Lever job posting.

    Args:
        page: Playwright page object
        cfg: Application configuration
        counts: Dictionary to track application counts
        logs: Path to log file
        run_id: Run identifier for this execution
        claimant_id: Optional claimant identifier
        per_site_applied: Mutable dict of applied count per site (bumped on applied)

    Returns:
        Updated counts dictionary or None
    """
    if not is_lever(page):
        result = log(
            logs,
            {
                "site": "lever",
                "job_title": "",
                "company": "",
                "url": page.url,
                "status": STATUS_ERROR,
                "notes": "not_a_lever_page",
            },
            run_id=run_id,
            claimant_id=claimant_id,
        )
        _bump(counts, result["status"])
        return counts

    title, company = _extract_job_info(page)

    try:
        # Lever forms typically use "form[name='application']"
        # Fill basic personal information fields
        # Lever often uses "Full name" instead of separate first/last
        full_name = f"{cfg.account.first_name} {cfg.account.last_name}"
        fill_text(page, "Full name", full_name)
        fill_text(page, "Name", full_name)
        # Also try separate fields
        fill_text(page, "First Name", cfg.account.first_name)
        fill_text(page, "Last Name", cfg.account.last_name)
        
        fill_text(page, "Email", cfg.account.email)
        fill_text(page, "Phone", cfg.account.phone)
        
        # Fill location if available
        if cfg.account.location:
            fill_text(page, "Location", cfg.account.location)
        if cfg.account.city:
            fill_text(page, "City", cfg.account.city)
        if cfg.account.postcode:
            fill_text(page, "Postcode", cfg.account.postcode)
            fill_text(page, "Postal Code", cfg.account.postcode)
            fill_text(page, "Zip Code", cfg.account.postcode)
        
        # Upload CV/resume
        cv_path = cfg.defaults.cv_path
        if cv_path:
            upload_file(page, cv_path)
        
        # Try to upload cover letter if field exists
        # Lever often has a cover letter field
        cover_letter_path = cfg.defaults.cover_letter_template
        if cover_letter_path and Path(cover_letter_path).exists():
            # Try to find a cover letter file input (usually second file input)
            try:
                file_inputs = page.locator("input[type='file']")
                if file_inputs.count() > 1:
                    # Second file input is often for cover letter
                    file_inputs.nth(1).set_input_files(str(cover_letter_path))
            except Exception:
                # If that fails, try to find by label
                pass
        
        # Handle yes/no questions
        _handle_yes_no_questions(page)
        
        # Custom answers from config
        cfg_dict = cfg.to_dict()
        if cfg_dict.get("answers"):
            for label, value in cfg_dict["answers"].items():
                fill_text(page, label.replace("_", " "), str(value))
        
        if not click_first_matching(page, ["Submit Application", "Apply", "Submit"]):
            raise Exception("Could not find submit button")

        result = log(
            logs,
            {
                "site": "lever",
                "job_title": title,
                "company": company,
                "url": page.url,
                "status": STATUS_APPLIED,
                "notes": "",
            },
            run_id=run_id,
            claimant_id=claimant_id,
        )
        _bump(counts, result["status"])
        if per_site_applied is not None:
            per_site_applied["lever"] = per_site_applied.get("lever", 0) + 1

    except Exception as e:
        result = log(
            logs,
            {
                "site": "lever",
                "job_title": title,
                "company": company,
                "url": page.url,
                "status": STATUS_ERROR,
                "notes": str(e)[:180],
            },
            run_id=run_id,
            claimant_id=claimant_id,
        )
        _bump(counts, result["status"])

    return counts


class LeverAdapter:
    """Lever adapter implementing JobPlatformAdapter. No search-based discovery."""

    @property
    def name(self) -> str:
        return "lever"

    def discover_jobs(
        self,
        search_config: SearchConfig,
        config: AppConfig,
        page: "Page",
        ctx: AdapterContext,
    ) -> list[Job]:
        return []

    def apply_to_job(
        self,
        job: Job,
        config: AppConfig,
        page: "Page",
        ctx: AdapterContext,
    ) -> ApplicationResult:
        if not is_lever(page):
            entry = {
                "site": "lever",
                "job_title": job.title or "",
                "company": job.company or "",
                "url": job.url or page.url,
                "status": STATUS_ERROR,
                "notes": "not_a_lever_page",
            }
            ctx.log(entry)
            return ApplicationResult(status=STATUS_ERROR, notes="not_a_lever_page")

        title, company = _extract_job_info(page)
        job_title = title or job.title or ""
        job_company = company or job.company or ""
        url = page.url
        try:
            full_name = f"{config.account.first_name} {config.account.last_name}"
            fill_text(page, "Full name", full_name)
            fill_text(page, "Name", full_name)
            fill_text(page, "First Name", config.account.first_name)
            fill_text(page, "Last Name", config.account.last_name)
            fill_text(page, "Email", config.account.email)
            fill_text(page, "Phone", config.account.phone)
            if config.account.location:
                fill_text(page, "Location", config.account.location)
            if config.account.city:
                fill_text(page, "City", config.account.city)
            if config.account.postcode:
                fill_text(page, "Postcode", config.account.postcode)
                fill_text(page, "Postal Code", config.account.postcode)
                fill_text(page, "Zip Code", config.account.postcode)
            cv_path = config.defaults.cv_path
            if cv_path:
                upload_file(page, cv_path)
            cover_letter_path = config.defaults.cover_letter_template
            if cover_letter_path and Path(cover_letter_path).exists():
                try:
                    file_inputs = page.locator("input[type='file']")
                    if file_inputs.count() > 1:
                        file_inputs.nth(1).set_input_files(str(cover_letter_path))
                except Exception:
                    pass
            _handle_yes_no_questions(page)
            cfg_dict = config.to_dict()
            if cfg_dict.get("answers"):
                for label, value in cfg_dict["answers"].items():
                    fill_text(page, label.replace("_", " "), str(value))
            if not click_first_matching(page, ["Submit Application", "Apply", "Submit"]):
                raise Exception("Could not find submit button")
            entry = {
                "site": "lever",
                "job_title": job_title,
                "company": job_company,
                "url": url,
                "status": STATUS_APPLIED,
                "notes": "",
            }
            ctx.log(entry)
            return ApplicationResult(
                status=STATUS_APPLIED, notes="", site_applied="lever"
            )
        except Exception as e:  # noqa: BLE001
            notes = str(e)[:180]
            entry = {
                "site": "lever",
                "job_title": job_title,
                "company": job_company,
                "url": url,
                "status": STATUS_ERROR,
                "notes": notes,
            }
            ctx.log(entry)
            return ApplicationResult(status=STATUS_ERROR, notes=notes)

