"""Tests for Workday adapter."""

from unittest.mock import Mock, patch

from autoapply.adapters.workday import WorkdayAdapter, _is_workday_url, _normalize_job_url
from autoapply.core.adapters_base import AdapterContext, Job
from autoapply.core.config import AppConfig, SearchConfig
from autoapply.core.storage import STATUS_SKIPPED


def test_workday_adapter_import_and_instantiate() -> None:
    """Adapter can be imported and instantiated."""
    adapter = WorkdayAdapter()
    assert adapter is not None
    assert adapter.name == "workday"


def test_workday_adapter_implements_protocol() -> None:
    """WorkdayAdapter implements JobPlatformAdapter."""
    adapter: WorkdayAdapter = WorkdayAdapter()
    assert hasattr(adapter, "discover_jobs")
    assert hasattr(adapter, "apply_to_job")
    assert callable(adapter.discover_jobs)
    assert callable(adapter.apply_to_job)


def test_is_workday_url() -> None:
    """_is_workday_url recognizes Workday domains."""
    assert _is_workday_url("https://acme.wd1.myworkdayjobs.com/en-US/Careers") is True
    assert _is_workday_url("https://example.workday.com/wday/cxs/example/jobs") is True
    assert _is_workday_url("https://example.com/jobs") is False
    assert _is_workday_url("") is False


def test_normalize_job_url() -> None:
    """_normalize_job_url resolves relative hrefs."""
    base = "https://acme.wd1.myworkdayjobs.com/en-US/Careers"
    assert _normalize_job_url("/en-US/Careers/job/123", base) == "https://acme.wd1.myworkdayjobs.com/en-US/Careers/job/123"
    assert _normalize_job_url("https://other.com/job/1", base) == "https://other.com/job/1"
    assert _normalize_job_url(None, base) is None
    assert _normalize_job_url("  ", base) is None


def test_discover_jobs_empty_base_url_returns_empty() -> None:
    """discover_jobs returns [] when workday_base_url is missing."""
    adapter = WorkdayAdapter()
    search_cfg = Mock(spec=SearchConfig)
    search_cfg.workday_base_url = None
    search_cfg.name = "test"
    cfg = Mock(spec=AppConfig)
    page = Mock()
    ctx = Mock(spec=AdapterContext)
    jobs = adapter.discover_jobs(search_cfg, cfg, page, ctx)
    assert jobs == []


def test_discover_jobs_empty_string_base_url_returns_empty() -> None:
    """discover_jobs returns [] when workday_base_url is empty string."""
    adapter = WorkdayAdapter()
    search_cfg = Mock(spec=SearchConfig)
    search_cfg.workday_base_url = ""
    search_cfg.name = "test"
    cfg = Mock(spec=AppConfig)
    page = Mock()
    ctx = Mock(spec=AdapterContext)
    jobs = adapter.discover_jobs(search_cfg, cfg, page, ctx)
    assert jobs == []


def test_apply_to_job_skipped_when_apply_button_not_found() -> None:
    """apply_to_job returns skipped when Apply button not found (mocked page)."""
    adapter = WorkdayAdapter()
    job = Job(
        url="https://example.wd1.myworkdayjobs.com/en-US/job/123",
        title="Test Job",
        company="Test Co",
        site="workday",
        search_name="test",
    )
    cfg = Mock(spec=AppConfig)
    page = Mock()
    page.url = "https://example.wd1.myworkdayjobs.com/en-US/job/123"
    page.goto = Mock()
    page.wait_for_timeout = Mock()
    page.get_by_role = Mock(return_value=Mock(count=Mock(return_value=0)))
    page.locator = Mock(return_value=Mock(count=Mock(return_value=0)))
    log_calls: list[dict] = []

    def _log(e: dict) -> None:
        log_calls.append(e)

    def _save(_p: object, _s: str) -> None:
        pass

    ctx = AdapterContext(log=_log, save_artifacts=_save, dry_run=False)
    with patch("autoapply.adapters.workday.click_first_matching", return_value=False):
        result = adapter.apply_to_job(job, cfg, page, ctx)

    assert result.status == STATUS_SKIPPED
    assert "apply button not found" in result.notes
    assert len(log_calls) == 1
    assert log_calls[0]["status"] == STATUS_SKIPPED
    assert log_calls[0]["site"] == "workday"


def test_router_returns_workday_adapter() -> None:
    """get_adapter('workday') returns WorkdayAdapter instance."""
    from autoapply.core.router import get_adapter

    adapter = get_adapter("workday")
    assert adapter is not None
    assert adapter.name == "workday"
