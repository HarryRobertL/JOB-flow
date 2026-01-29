"""Tests for evidence logging and weekly compliance aggregation."""

import csv
import tempfile
from datetime import datetime, timedelta, UTC
from pathlib import Path

import pytest

from autoapply.evidence import (
    log_evidence,
    load_evidence_entries,
    aggregate_weekly_compliance,
    get_week_start_date,
)
from autoapply.models import EvidenceEntry


def test_get_week_start_date():
    """Test that week_start_date correctly calculates Monday."""
    # Monday
    monday = datetime(2025, 1, 13, 10, 0, 0, tzinfo=UTC)
    assert get_week_start_date(monday).date() == monday.date()
    
    # Tuesday
    tuesday = datetime(2025, 1, 14, 10, 0, 0, tzinfo=UTC)
    assert get_week_start_date(tuesday).date() == monday.date()
    
    # Sunday
    sunday = datetime(2025, 1, 19, 10, 0, 0, tzinfo=UTC)
    assert get_week_start_date(sunday).date() == monday.date()


def test_log_and_load_evidence():
    """Test logging and loading evidence entries."""
    with tempfile.TemporaryDirectory() as tmpdir:
        evidence_path = Path(tmpdir) / "evidence.csv"
        
        # Log some evidence entries
        entry1 = log_evidence(
            claimant_id="claimant-1",
            event_type="application_submitted",
            description="Applied to Software Engineer at Tech Corp",
            source="automation_engine",
            job_id="job-1",
            job_title="Software Engineer",
            company="Tech Corp",
            platform="indeed",
            url="https://indeed.com/job1",
            evidence_log_path=evidence_path,
        )
        
        entry2 = log_evidence(
            claimant_id="claimant-1",
            event_type="application_approved",
            description="Approved application to Data Scientist at Data Inc",
            source="claimant_dashboard",
            job_id="job-2",
            job_title="Data Scientist",
            company="Data Inc",
            platform="greenhouse",
            url="https://greenhouse.io/job2",
            evidence_log_path=evidence_path,
        )
        
        # Load entries
        loaded = load_evidence_entries(
            claimant_id="claimant-1",
            evidence_log_path=evidence_path,
        )
        
        assert len(loaded) == 2
        assert loaded[0].claimant_id == "claimant-1"
        assert loaded[0].event_type == "application_submitted"
        assert loaded[0].job_title == "Software Engineer"
        assert loaded[0].company == "Tech Corp"
        assert loaded[0].platform == "indeed"
        
        # Test filtering by date
        tomorrow = datetime.now(UTC) + timedelta(days=1)
        future_entries = load_evidence_entries(
            claimant_id="claimant-1",
            start_date=tomorrow,
            evidence_log_path=evidence_path,
        )
        assert len(future_entries) == 0


def test_aggregate_weekly_compliance():
    """Test weekly compliance aggregation."""
    # Create evidence entries for two weeks
    week1_start = datetime(2025, 1, 13, 10, 0, 0, tzinfo=UTC)  # Monday
    week2_start = datetime(2025, 1, 20, 10, 0, 0, tzinfo=UTC)  # Monday
    
    entries = [
        EvidenceEntry(
            claimant_id="claimant-1",
            event_type="application_submitted",
            description="Applied to Job 1",
            timestamp=(week1_start + timedelta(days=1)).isoformat(),
            week_start_date=week1_start.date().isoformat(),
            source="automation_engine",
            job_id="job-1",
            job_title="Job 1",
            company="Company 1",
            platform="indeed",
        ),
        EvidenceEntry(
            claimant_id="claimant-1",
            event_type="application_submitted",
            description="Applied to Job 2",
            timestamp=(week1_start + timedelta(days=2)).isoformat(),
            week_start_date=week1_start.date().isoformat(),
            source="automation_engine",
            job_id="job-2",
            job_title="Job 2",
            company="Company 2",
            platform="indeed",
        ),
        # Week 2 entries (more than required)
        EvidenceEntry(
            claimant_id="claimant-1",
            event_type="application_submitted",
            description="Applied to Job 3",
            timestamp=(week2_start + timedelta(days=1)).isoformat(),
            week_start_date=week2_start.date().isoformat(),
            source="automation_engine",
            job_id="job-3",
            job_title="Job 3",
            company="Company 3",
            platform="greenhouse",
        ),
        *[
            EvidenceEntry(
                claimant_id="claimant-1",
                event_type="application_submitted",
                description=f"Applied to Job {i+4}",
                timestamp=(week2_start + timedelta(days=2, hours=i)).isoformat(),
                week_start_date=week2_start.date().isoformat(),
                source="automation_engine",
                job_id=f"job-{i+4}",
                job_title=f"Job {i+4}",
                company=f"Company {i+4}",
                platform="indeed",
            )
            for i in range(10)  # 10 more applications in week 2
        ],
        # Non-application events should not be counted
        EvidenceEntry(
            claimant_id="claimant-1",
            event_type="application_approved",
            description="Approved application",
            timestamp=(week2_start + timedelta(days=3)).isoformat(),
            week_start_date=week2_start.date().isoformat(),
            source="claimant_dashboard",
            job_id="job-20",
            job_title="Job 20",
            company="Company 20",
            platform="indeed",
        ),
    ]
    
    # Aggregate with required = 10 per week
    summaries = aggregate_weekly_compliance(entries, required_applications_per_week=10)
    
    # Should have 2 weeks
    assert len(summaries) == 2
    
    # Week 2 should be first (sorted newest first)
    week2_summary = summaries[0]
    assert week2_summary.week_start_date == week2_start.date().isoformat()
    assert week2_summary.applications_count == 11  # 1 + 10 = 11 applications
    assert week2_summary.required_count == 10
    assert week2_summary.missed_requirement is False
    
    # Week 1 should be second
    week1_summary = summaries[1]
    assert week1_summary.week_start_date == week1_start.date().isoformat()
    assert week1_summary.applications_count == 2  # Only 2 applications
    assert week1_summary.required_count == 10
    assert week1_summary.missed_requirement is True  # 2 < 10


def test_aggregate_weekly_compliance_empty():
    """Test aggregation with no entries."""
    summaries = aggregate_weekly_compliance([], required_applications_per_week=10)
    assert len(summaries) == 0


def test_aggregate_weekly_compliance_no_week_start():
    """Test that entries without week_start_date are skipped."""
    entries = [
        EvidenceEntry(
            claimant_id="claimant-1",
            event_type="application_submitted",
            description="Applied to Job 1",
            timestamp=datetime.now(UTC).isoformat(),
            week_start_date=None,  # Missing week_start_date
            source="automation_engine",
            job_id="job-1",
        ),
    ]
    
    summaries = aggregate_weekly_compliance(entries, required_applications_per_week=10)
    assert len(summaries) == 0

