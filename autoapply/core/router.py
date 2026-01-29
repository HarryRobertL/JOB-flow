"""Route detection and adapter registry for job application platforms."""

from __future__ import annotations

from typing import TYPE_CHECKING, Literal

if TYPE_CHECKING:
    from autoapply.core.adapters_base import JobPlatformAdapter

RouteName = Literal["greenhouse", "lever", "unknown"]

_ADAPTER_REGISTRY: dict[str, "JobPlatformAdapter"] = {}


def _ensure_registry() -> None:
    if _ADAPTER_REGISTRY:
        return
    from autoapply.adapters.greenhouse import GreenhouseAdapter
    from autoapply.adapters.indeed import IndeedAdapter
    from autoapply.adapters.lever import LeverAdapter
    from autoapply.adapters.workday import WorkdayAdapter

    _ADAPTER_REGISTRY["indeed"] = IndeedAdapter()
    _ADAPTER_REGISTRY["greenhouse"] = GreenhouseAdapter()
    _ADAPTER_REGISTRY["lever"] = LeverAdapter()
    _ADAPTER_REGISTRY["workday"] = WorkdayAdapter()


def get_adapter(platform: str) -> JobPlatformAdapter | None:
    """Return the adapter for the given platform, or None if unknown."""
    _ensure_registry()
    return _ADAPTER_REGISTRY.get(platform)


def list_platforms() -> list[str]:
    """Return registered platform names."""
    _ensure_registry()
    return list(_ADAPTER_REGISTRY.keys())


def register_adapter(platform: str, adapter: JobPlatformAdapter) -> None:
    """Register an adapter for a platform (e.g. for tests)."""
    _ensure_registry()
    _ADAPTER_REGISTRY[platform] = adapter


def detect(page_url: str, page) -> RouteName:
    """
    Detect which platform a job application page belongs to.

    Args:
        page_url: The URL of the page
        page: Playwright page object

    Returns:
        The detected platform name or "unknown"
    """
    url = (page_url or "").lower()
    
    # Check for Greenhouse
    if "greenhouse.io" in url:
        return "greenhouse"
    try:
        if page.locator("form#application_form").count() > 0:
            return "greenhouse"
    except Exception:
        pass
    
    # Check for Lever
    if "lever.co" in url:
        return "lever"
    try:
        if page.locator("form[name='application']").count() > 0:
            return "lever"
    except Exception:
        pass
    
    return "unknown"

