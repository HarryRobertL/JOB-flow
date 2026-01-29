"""Smoke tests for platform adapters. No live job sites."""

from unittest.mock import Mock

import pytest

from autoapply.core.adapters_base import AdapterContext
from autoapply.core.config import AppConfig, SearchConfig


def test_indeed_adapter_smoke() -> None:
    """Import IndeedAdapter, instantiate, and verify protocol."""
    from autoapply.adapters.indeed import IndeedAdapter

    adapter = IndeedAdapter()
    assert adapter is not None
    assert adapter.name == "indeed"
    assert hasattr(adapter, "discover_jobs") and callable(adapter.discover_jobs)
    assert hasattr(adapter, "apply_to_job") and callable(adapter.apply_to_job)


def test_greenhouse_adapter_smoke() -> None:
    """Import GreenhouseAdapter, instantiate, discover_jobs returns [] without a real page."""
    from autoapply.adapters.greenhouse import GreenhouseAdapter

    adapter = GreenhouseAdapter()
    assert adapter is not None
    assert adapter.name == "greenhouse"
    search_cfg = Mock(spec=SearchConfig)
    search_cfg.name = "smoke"
    cfg = Mock(spec=AppConfig)
    page = Mock()
    ctx = Mock(spec=AdapterContext)
    jobs = adapter.discover_jobs(search_cfg, cfg, page, ctx)
    assert jobs == []


def test_lever_adapter_smoke() -> None:
    """Import LeverAdapter, instantiate, discover_jobs returns [] without a real page."""
    from autoapply.adapters.lever import LeverAdapter

    adapter = LeverAdapter()
    assert adapter is not None
    assert adapter.name == "lever"
    search_cfg = Mock(spec=SearchConfig)
    search_cfg.name = "smoke"
    cfg = Mock(spec=AppConfig)
    page = Mock()
    ctx = Mock(spec=AdapterContext)
    jobs = adapter.discover_jobs(search_cfg, cfg, page, ctx)
    assert jobs == []


def test_workday_adapter_smoke() -> None:
    """Import WorkdayAdapter, instantiate, discover_jobs returns [] when workday_base_url missing."""
    from autoapply.adapters.workday import WorkdayAdapter

    adapter = WorkdayAdapter()
    assert adapter is not None
    assert adapter.name == "workday"
    search_cfg = Mock(spec=SearchConfig)
    search_cfg.workday_base_url = None
    search_cfg.name = "smoke"
    cfg = Mock(spec=AppConfig)
    page = Mock()
    ctx = Mock(spec=AdapterContext)
    jobs = adapter.discover_jobs(search_cfg, cfg, page, ctx)
    assert jobs == []
