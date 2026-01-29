"""Tests for storage and logging functionality."""

from pathlib import Path

from autoapply.core.storage import (
    RUN_STATUS_COMPLETED,
    RUN_STATUS_RUNNING,
    STATUS_APPLIED,
    RunState,
    log,
    print_summary,
    read_run_state,
    write_run_state,
)


def test_log_creates_file(tmp_path):
    """Test that log creates a CSV file with headers."""
    log_file = tmp_path / "test_logs.csv"
    row = {
        "site": "indeed",
        "job_title": "Software Engineer",
        "company": "Test Corp",
        "url": "https://example.com",
        "status": STATUS_APPLIED,
        "notes": "",
    }
    result = log(str(log_file), row, run_id="run1", claimant_id="user1")
    assert log_file.exists()
    assert "ts" in result
    assert result["site"] == "indeed"
    assert result["run_id"] == "run1"
    assert result["claimant_id"] == "user1"


def test_print_summary(capsys):
    """Test that print_summary outputs correctly."""
    counts = {"applied": 5, "skipped": 2, "error": 1}
    print_summary(counts)
    captured = capsys.readouterr()
    assert "applied" in captured.out.lower()
    assert "5" in captured.out


def test_write_run_state(tmp_path: Path) -> None:
    """write_run_state creates JSON file with RunState fields."""
    path = tmp_path / "run_state.json"
    state = RunState(
        run_id="abc123",
        started_at="2025-01-15T10:00:00+00:00",
        finished_at="2025-01-15T10:05:00+00:00",
        status=RUN_STATUS_COMPLETED,
        total_attempted=5,
        total_applied=2,
        total_skipped=2,
        total_error=1,
        notes="",
    )
    write_run_state(state, path)
    assert path.exists()
    data = path.read_text(encoding="utf-8")
    assert "abc123" in data
    assert "completed" in data
    assert "total_applied" in data


def test_read_run_state(tmp_path: Path) -> None:
    """read_run_state returns RunState when file exists."""
    path = tmp_path / "run_state.json"
    state = RunState(
        run_id="xyz",
        started_at="2025-01-15T10:00:00+00:00",
        status=RUN_STATUS_RUNNING,
        total_applied=1,
        total_skipped=0,
        total_error=0,
        total_attempted=1,
    )
    write_run_state(state, path)
    got = read_run_state(path)
    assert got is not None
    assert got.run_id == "xyz"
    assert got.status == RUN_STATUS_RUNNING
    assert got.total_applied == 1
    assert got.total_attempted == 1


def test_read_run_state_missing(tmp_path: Path) -> None:
    """read_run_state returns None when file does not exist."""
    path = tmp_path / "nonexistent.json"
    assert not path.exists()
    assert read_run_state(path) is None

