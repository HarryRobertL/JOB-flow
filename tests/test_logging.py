"""Tests for standardized application logging (run_id, status, CSV format)."""

import csv
from pathlib import Path

import pytest

from autoapply.core.storage import (
    STATUS_APPLIED,
    STATUS_ERROR,
    STATUS_SKIPPED,
    ApplicationLogEntry,
    log,
    normalize_status_for_read,
)


def test_application_log_entry_to_row() -> None:
    """ApplicationLogEntry.to_row() produces expected keys."""
    e = ApplicationLogEntry(
        site="indeed",
        job_title="Engineer",
        company="Co",
        url="https://example.com/job",
        status=STATUS_APPLIED,
        notes="ok",
        run_id="run-abc",
        claimant_id="user1",
    )
    row = e.to_row()
    assert row["site"] == "indeed"
    assert row["job_title"] == "Engineer"
    assert row["status"] == STATUS_APPLIED
    assert row["run_id"] == "run-abc"
    assert row["claimant_id"] == "user1"


def test_log_writes_run_id_and_status(tmp_path: Path) -> None:
    """Logging writes run_id and standard statuses; rows can be read back."""
    log_file = tmp_path / "logs.csv"
    run_id = "run-xyz-123"

    log(
        log_file,
        ApplicationLogEntry(
            site="greenhouse",
            job_title="Developer",
            company="Acme",
            url="https://acme.com/job",
            status=STATUS_APPLIED,
            notes="",
            run_id=run_id,
            claimant_id="claimant-1",
        ),
        run_id=run_id,
        claimant_id="claimant-1",
    )
    log(
        log_file,
        ApplicationLogEntry(
            site="indeed",
            job_title="QA",
            company="Beta",
            url="https://beta.com/job",
            status=STATUS_SKIPPED,
            notes="filter",
            run_id=run_id,
            claimant_id="claimant-1",
        ),
        run_id=run_id,
        claimant_id="claimant-1",
    )
    log(
        log_file,
        {
            "site": "lever",
            "job_title": "PM",
            "company": "Gamma",
            "url": "https://gamma.com/job",
            "status": STATUS_ERROR,
            "notes": "timeout",
        },
        run_id=run_id,
        claimant_id="claimant-1",
    )

    with log_file.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    assert len(rows) == 3
    for r in rows:
        assert "run_id" in r
        assert r["run_id"] == run_id
        assert "claimant_id" in r
        assert r["claimant_id"] == "claimant-1"
        assert r["status"] in (STATUS_APPLIED, STATUS_SKIPPED, STATUS_ERROR)

    assert rows[0]["status"] == STATUS_APPLIED and rows[0]["site"] == "greenhouse"
    assert rows[1]["status"] == STATUS_SKIPPED and rows[1]["site"] == "indeed"
    assert rows[2]["status"] == STATUS_ERROR and rows[2]["site"] == "lever"


def test_csv_header_has_expected_columns(tmp_path: Path) -> None:
    """CSV header contains ts, run_id, claimant_id, site, job_title, company, url, status, notes."""
    log_file = tmp_path / "logs.csv"
    log(
        log_file,
        ApplicationLogEntry(
            site="indeed",
            job_title="X",
            company="Y",
            url="https://u",
            status=STATUS_SKIPPED,
            notes="n",
            run_id="r",
            claimant_id="c",
        ),
        run_id="r",
        claimant_id="c",
    )

    with log_file.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        headers = list(reader.fieldnames or [])

    for name in ("ts", "run_id", "claimant_id", "site", "job_title", "company", "url", "status", "notes"):
        assert name in headers, f"missing column {name}"


def test_normalize_status_for_read() -> None:
    """normalize_status_for_read maps 'skip' -> 'skipped' and preserves others."""
    assert normalize_status_for_read("skip") == STATUS_SKIPPED
    assert normalize_status_for_read("skipped") == STATUS_SKIPPED
    assert normalize_status_for_read("applied") == STATUS_APPLIED
    assert normalize_status_for_read("error") == STATUS_ERROR
    assert normalize_status_for_read("") == ""


def test_application_log_entry_csv_roundtrip(tmp_path: Path) -> None:
    """Log ApplicationLogEntry to CSV, read back, and verify structure."""
    import csv

    log_file = tmp_path / "logs.csv"
    entry = ApplicationLogEntry(
        site="indeed",
        job_title="Engineer",
        company="Acme",
        url="https://example.com/job/1",
        status=STATUS_APPLIED,
        notes="ok",
        run_id="run-rt",
        claimant_id="user-rt",
    )
    log(log_file, entry, run_id=entry.run_id, claimant_id=entry.claimant_id)
    assert log_file.exists()
    with log_file.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    assert len(rows) == 1
    row = rows[0]
    assert row["ts"]
    assert row["run_id"] == "run-rt"
    assert row["claimant_id"] == "user-rt"
    assert row["site"] == "indeed"
    assert row["job_title"] == "Engineer"
    assert row["company"] == "Acme"
    assert row["url"] == "https://example.com/job/1"
    assert row["status"] == STATUS_APPLIED
    assert row["notes"] == "ok"
