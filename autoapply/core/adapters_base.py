"""Common protocol and types for job platform adapters."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Callable, Protocol, runtime_checkable

if TYPE_CHECKING:
    from playwright.sync_api import Page

from autoapply.core.config import AppConfig, SearchConfig


@dataclass
class Job:
    """Minimal job descriptor used across adapters."""

    url: str
    title: str = ""
    company: str = ""
    site: str = ""
    search_name: str = ""


@dataclass
class ApplicationResult:
    """Outcome of a single application attempt."""

    status: str  # STATUS_APPLIED | STATUS_SKIPPED | STATUS_ERROR
    notes: str = ""
    snippet: str = ""
    site_applied: str = ""  # platform to bump when status==applied (e.g. greenhouse on redirect)


@dataclass
class AdapterContext:
    """Context passed to discover_jobs and apply_to_job."""

    log: Callable[[dict], None]
    save_artifacts: Callable[[object, str], None]
    dry_run: bool = False
    wait_for_verification: Callable[[object, str], None] | None = None
    per_site_applied: dict[str, int] | None = None
    per_site_cap: int = 0
    daily_cap: int = 0


@runtime_checkable
class JobPlatformAdapter(Protocol):
    """Protocol for platform-specific job discovery and application."""

    @property
    def name(self) -> str:
        """Platform identifier (e.g. 'indeed', 'greenhouse', 'lever')."""
        ...

    def discover_jobs(
        self,
        search_config: SearchConfig,
        config: AppConfig,
        page: "Page",
        ctx: AdapterContext,
    ) -> list[Job]:
        """Discover jobs for the given search. Return [] for platforms that do not search."""
        ...

    def apply_to_job(
        self,
        job: Job,
        config: AppConfig,
        page: "Page",
        ctx: AdapterContext,
    ) -> ApplicationResult:
        """Apply to a single job. Page must be on job.url for URL-only adapters (e.g. Greenhouse, Lever)."""
        ...


__all__ = [
    "AdapterContext",
    "ApplicationResult",
    "Job",
    "JobPlatformAdapter",
]
