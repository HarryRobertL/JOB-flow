"""Tests for caps enforcement and pause-between-apps behaviour."""

from unittest.mock import patch

from autoapply.adapters.indeed import _at_cap, _pause_with_jitter
from autoapply.core.storage import STATUS_APPLIED, STATUS_ERROR, STATUS_SKIPPED


def test_at_cap_stops_when_reached() -> None:
    """_at_cap returns True when applied count >= daily cap."""
    counts = {STATUS_APPLIED: 10, STATUS_SKIPPED: 2, STATUS_ERROR: 0}
    assert _at_cap(counts, 10) is True
    assert _at_cap(counts, 9) is True
    assert _at_cap(counts, 11) is False
    assert _at_cap(counts, None) is False
    assert _at_cap(None, 5) is False


def test_caps_stop_loop_when_reached() -> None:
    """Simulated loop stops when daily cap is reached."""
    from autoapply.run import _caps_exceeded, reached_cap

    counts = {STATUS_APPLIED: 0, STATUS_SKIPPED: 0, STATUS_ERROR: 0}
    per_site = {"indeed": 0, "greenhouse": 0, "lever": 0}
    daily_cap = 3
    per_site_cap = 5  # above daily so daily cap is the limiter

    attempted = 0
    for _ in range(10):
        if reached_cap(counts, daily_cap):
            break
        if _caps_exceeded(
            counts.get(STATUS_APPLIED, 0), per_site, "indeed", daily_cap, per_site_cap
        ):
            break
        attempted += 1
        counts[STATUS_APPLIED] = counts.get(STATUS_APPLIED, 0) + 1
        per_site["indeed"] = per_site.get("indeed", 0) + 1

    assert attempted == 3
    assert counts[STATUS_APPLIED] == 3
    assert per_site["indeed"] == 3


def test_per_site_cap_stops_loop() -> None:
    """Loop stops when per-site cap is reached before daily cap."""
    from autoapply.run import _caps_exceeded, reached_cap

    counts = {STATUS_APPLIED: 0, STATUS_SKIPPED: 0, STATUS_ERROR: 0}
    per_site = {"indeed": 0, "greenhouse": 0, "lever": 0}
    daily_cap = 10
    per_site_cap = 2

    attempted = 0
    for _ in range(10):
        if reached_cap(counts, daily_cap):
            break
        if _caps_exceeded(
            counts.get(STATUS_APPLIED, 0), per_site, "indeed", daily_cap, per_site_cap
        ):
            break
        attempted += 1
        counts[STATUS_APPLIED] = counts.get(STATUS_APPLIED, 0) + 1
        per_site["indeed"] = per_site.get("indeed", 0) + 1

    assert attempted == 2
    assert per_site["indeed"] == 2


def test_run_timed_out() -> None:
    """_run_timed_out returns True when current time >= deadline."""
    from unittest.mock import patch

    from autoapply.run import _run_timed_out

    with patch("autoapply.run.time.monotonic", return_value=100.0):
        assert _run_timed_out(99.0) is True   # now >= deadline
        assert _run_timed_out(100.0) is True
        assert _run_timed_out(101.0) is False  # now < deadline, not timed out
    with patch("autoapply.run.time.monotonic", return_value=50.0):
        assert _run_timed_out(100.0) is False
        assert _run_timed_out(50.0) is True


def test_pause_with_jitter_in_range() -> None:
    """_pause_with_jitter produces sleeps within [min, max] ± jitter."""
    pause_min, pause_max = 5.0, 25.0
    seen: list[float] = []

    with patch("autoapply.adapters.indeed.sleep", side_effect=lambda d: seen.append(d)):
        for _ in range(100):
            _pause_with_jitter(pause_min, pause_max)

    assert len(seen) == 100
    for d in seen:
        # Jitter ±0.5, so effective range [min-0.5, max+0.5]; we use max(0, base + jitter)
        assert pause_min - 0.5 <= d <= pause_max + 0.5, (
            f"delay {d} outside [{pause_min}, {pause_max}] ± 0.5"
        )
