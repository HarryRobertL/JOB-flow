"""Tests for adapter protocol, Job/ApplicationResult, and router registry."""

from unittest.mock import Mock

from autoapply.core.adapters_base import (
    AdapterContext,
    ApplicationResult,
    Job,
    JobPlatformAdapter,
)
from autoapply.core.config import AppConfig, SearchConfig
from autoapply.core.router import get_adapter, list_platforms, register_adapter
from autoapply.core.storage import STATUS_APPLIED, STATUS_ERROR


class DummyAdapter:
    """Minimal adapter for testing protocol and router."""

    def __init__(self, name: str = "dummy") -> None:
        self._name = name

    @property
    def name(self) -> str:
        return self._name

    def discover_jobs(self, search_config: SearchConfig, config: AppConfig, page: object, ctx: AdapterContext) -> list[Job]:
        return [
            Job(url="https://example.com/job/1", title="Job 1", company="Co 1", site=self._name),
            Job(url="https://example.com/job/2", title="Job 2", company="Co 2", site=self._name),
        ]

    def apply_to_job(self, job: Job, config: AppConfig, page: object, ctx: AdapterContext) -> ApplicationResult:
        if "fail" in job.url:
            return ApplicationResult(status=STATUS_ERROR, notes="simulated fail")
        return ApplicationResult(status=STATUS_APPLIED, notes="", site_applied=self._name)


def test_job_dataclass() -> None:
    j = Job(url="https://example.com/j", title="t", company="c", site="x", search_name="s")
    assert j.url == "https://example.com/j"
    assert j.title == "t"
    assert j.company == "c"
    assert j.site == "x"
    assert j.search_name == "s"


def test_application_result_dataclass() -> None:
    r = ApplicationResult(status=STATUS_APPLIED, notes="ok", snippet="x", site_applied="indeed")
    assert r.status == STATUS_APPLIED
    assert r.notes == "ok"
    assert r.snippet == "x"
    assert r.site_applied == "indeed"


def test_dummy_adapter_implements_protocol() -> None:
    a: JobPlatformAdapter = DummyAdapter()
    assert a.name == "dummy"


def test_dummy_adapter_discover_jobs() -> None:
    cfg = Mock(spec=AppConfig)
    search_cfg = Mock(spec=SearchConfig)
    page = Mock()
    ctx = Mock(spec=AdapterContext)
    a = DummyAdapter()
    jobs = a.discover_jobs(search_cfg, cfg, page, ctx)
    assert len(jobs) == 2
    assert jobs[0].url == "https://example.com/job/1"
    assert jobs[0].title == "Job 1"
    assert jobs[1].url == "https://example.com/job/2"


def test_dummy_adapter_apply_to_job() -> None:
    cfg = Mock(spec=AppConfig)
    page = Mock()
    ctx = Mock(spec=AdapterContext)
    a = DummyAdapter()
    job = Job(url="https://example.com/job/1", title="Job 1", company="Co 1", site="dummy")
    res = a.apply_to_job(job, cfg, page, ctx)
    assert res.status == STATUS_APPLIED
    assert res.site_applied == "dummy"


def test_dummy_adapter_apply_fail() -> None:
    cfg = Mock(spec=AppConfig)
    page = Mock()
    ctx = Mock(spec=AdapterContext)
    a = DummyAdapter()
    job = Job(url="https://example.com/job/fail", title="Fail", company="Co", site="dummy")
    res = a.apply_to_job(job, cfg, page, ctx)
    assert res.status == STATUS_ERROR
    assert "fail" in res.notes


def test_router_get_adapter_returns_builtins() -> None:
    assert get_adapter("indeed") is not None
    assert get_adapter("greenhouse") is not None
    assert get_adapter("lever") is not None
    assert get_adapter("workday") is not None
    assert get_adapter("unknown_platform") is None


def test_router_list_platforms() -> None:
    platforms = list_platforms()
    assert "indeed" in platforms
    assert "greenhouse" in platforms
    assert "lever" in platforms
    assert "workday" in platforms


def test_router_register_adapter_and_get() -> None:
    dummy = DummyAdapter(name="test_platform")
    register_adapter("test_platform", dummy)
    got = get_adapter("test_platform")
    assert got is dummy
    assert got.name == "test_platform"


def test_router_uses_dummy_adapter_discover_and_apply() -> None:
    """Router lookup + dummy adapter discover_jobs and apply_to_job."""
    dummy = DummyAdapter(name="integration_test")
    register_adapter("integration_test", dummy)

    adapter = get_adapter("integration_test")
    assert adapter is not None
    assert adapter is dummy

    cfg = Mock(spec=AppConfig)
    search_cfg = Mock(spec=SearchConfig)
    page = Mock()
    log_calls: list[dict] = []

    def _log(e: dict) -> None:
        log_calls.append(e)

    def _save(_page: object, _label: str) -> None:
        pass

    ctx = AdapterContext(log=_log, save_artifacts=_save)

    jobs = adapter.discover_jobs(search_cfg, cfg, page, ctx)
    assert len(jobs) == 2

    res = adapter.apply_to_job(jobs[0], cfg, page, ctx)
    assert res.status == STATUS_APPLIED
    assert res.site_applied == "integration_test"
