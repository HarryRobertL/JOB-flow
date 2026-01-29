"""Evidence logging and compliance aggregation utilities."""

import csv
from datetime import datetime, timedelta, UTC
from pathlib import Path
from typing import List, Dict, Any, Optional

from autoapply.models import EvidenceEntry, WeeklyComplianceSummary
from autoapply.db.repo import db_enabled as _db_enabled
from autoapply.db.repo import insert_evidence_event as _insert_evidence_event
from autoapply.db.repo import query_evidence_events as _query_evidence_events

# Default path (can be overridden)
EVIDENCE_LOG_PATH = Path("data/evidence.csv")


def get_week_start_date(date: datetime) -> datetime:
    """
    Get the Monday (week start) for a given date.
    
    Args:
        date: Date to get week start for
        
    Returns:
        Monday of the week (00:00:00)
    """
    # Monday is 0, Sunday is 6
    days_since_monday = date.weekday()
    week_start = date - timedelta(days=days_since_monday)
    return week_start.replace(hour=0, minute=0, second=0, microsecond=0)


def log_evidence(
    claimant_id: str,
    event_type: str,
    description: str,
    source: str,
    job_id: Optional[str] = None,
    job_title: Optional[str] = None,
    company: Optional[str] = None,
    platform: Optional[str] = None,
    url: Optional[str] = None,
    timestamp: Optional[datetime] = None,
    evidence_log_path: Path = EVIDENCE_LOG_PATH,
) -> EvidenceEntry:
    """
    Log an evidence entry to CSV.
    
    Args:
        claimant_id: Claimant identifier
        event_type: Type of event (job_discovered, application_submitted, etc.)
        description: Human-readable description
        source: Source system or user action
        job_id: Optional job ID
        job_title: Optional job title
        company: Optional company name
        platform: Optional platform name
        url: Optional job URL
        timestamp: Optional timestamp (defaults to now)
        evidence_log_path: Path to evidence CSV file
        
    Returns:
        EvidenceEntry that was logged
    """
    if timestamp is None:
        timestamp = datetime.now(UTC)
    
    week_start = get_week_start_date(timestamp)
    
    entry = EvidenceEntry(
        claimant_id=claimant_id,
        event_type=event_type,
        description=description,
        timestamp=timestamp.isoformat(),
        week_start_date=week_start.date().isoformat(),
        source=source,
        job_id=job_id,
        job_title=job_title,
        company=company,
        platform=platform,
        url=url,
    )
    
    # Ensure directory exists
    evidence_log_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Write to CSV
    file_exists = evidence_log_path.exists()
    
    fieldnames = [
        "timestamp",
        "claimant_id",
        "event_type",
        "description",
        "week_start_date",
        "source",
        "job_id",
        "job_title",
        "company",
        "platform",
        "url",
    ]
    
    with evidence_log_path.open("a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        
        writer.writerow({
            "timestamp": entry.timestamp,
            "claimant_id": entry.claimant_id,
            "event_type": entry.event_type,
            "description": entry.description,
            "week_start_date": entry.week_start_date,
            "source": entry.source,
            "job_id": entry.job_id or "",
            "job_title": entry.job_title or "",
            "company": entry.company or "",
            "platform": entry.platform or "",
            "url": entry.url or "",
        })

    # SaaS mode: also persist into Postgres if configured.
    if _db_enabled():
        try:
            import os

            tenant_id = os.environ.get("AUTOAPPLYER_TENANT_ID", "default")
            _insert_evidence_event(
                tenant_id=tenant_id,
                row={
                    "timestamp": entry.timestamp,
                    "claimant_id": entry.claimant_id,
                    "event_type": entry.event_type,
                    "description": entry.description,
                    "week_start_date": entry.week_start_date,
                    "source": entry.source,
                    "job_id": entry.job_id,
                    "job_title": entry.job_title,
                    "company": entry.company,
                    "platform": entry.platform,
                    "url": entry.url,
                },
            )
        except Exception:
            pass
    
    return entry


def load_evidence_entries(
    claimant_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    evidence_log_path: Path = EVIDENCE_LOG_PATH,
) -> List[EvidenceEntry]:
    """
    Load evidence entries from CSV.
    
    Args:
        claimant_id: Optional filter by claimant ID
        start_date: Optional start date filter
        end_date: Optional end date filter
        evidence_log_path: Path to evidence CSV file
        
    Returns:
        List of EvidenceEntry objects
    """
    # SaaS mode: prefer DB query if available.
    if _db_enabled():
        try:
            import os

            tenant_id = os.environ.get("AUTOAPPLYER_TENANT_ID", "default")
            start_iso = start_date.isoformat() if start_date else None
            end_iso = end_date.isoformat() if end_date else None
            rows = _query_evidence_events(
                tenant_id=tenant_id,
                claimant_id=claimant_id,
                start_iso=start_iso,
                end_iso=end_iso,
            )
            entries: list[EvidenceEntry] = []
            for row in rows:
                entries.append(
                    EvidenceEntry(
                        claimant_id=row["claimant_id"],
                        event_type=row["event_type"],
                        description=row["description"],
                        timestamp=row["timestamp"],
                        week_start_date=row.get("week_start_date") or None,
                        source=row["source"],
                        job_id=row.get("job_id") or None,
                        job_title=row.get("job_title") or None,
                        company=row.get("company") or None,
                        platform=row.get("platform") or None,
                        url=row.get("url") or None,
                    )
                )
            return entries
        except Exception:
            # fall back to file
            pass

    if not evidence_log_path.exists():
        return []
    
    entries = []
    
    try:
        with evidence_log_path.open("r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    timestamp = datetime.fromisoformat(row["timestamp"].replace("Z", "+00:00"))
                    
                    # Apply filters
                    if claimant_id and row.get("claimant_id") != claimant_id:
                        continue
                    if start_date and timestamp < start_date:
                        continue
                    if end_date and timestamp > end_date:
                        continue
                    
                    entry = EvidenceEntry(
                        claimant_id=row["claimant_id"],
                        event_type=row["event_type"],
                        description=row["description"],
                        timestamp=row["timestamp"],
                        week_start_date=row.get("week_start_date") or None,
                        source=row["source"],
                        job_id=row.get("job_id") or None,
                        job_title=row.get("job_title") or None,
                        company=row.get("company") or None,
                        platform=row.get("platform") or None,
                        url=row.get("url") or None,
                    )
                    entries.append(entry)
                except Exception:
                    # Skip malformed rows
                    continue
    except Exception:
        pass
    
    return entries


def aggregate_weekly_compliance(
    evidence_entries: List[EvidenceEntry],
    required_applications_per_week: int = 10,
) -> List[WeeklyComplianceSummary]:
    """
    Aggregate evidence entries into weekly compliance summaries.
    
    Args:
        evidence_entries: List of evidence entries to aggregate
        required_applications_per_week: Required number of applications per week
        
    Returns:
        List of WeeklyComplianceSummary objects, sorted by week_start_date (newest first)
    """
    # Group by week_start_date
    week_map: Dict[str, List[EvidenceEntry]] = {}
    
    for entry in evidence_entries:
        if not entry.week_start_date:
            # Skip entries without week_start_date
            continue
        
        if entry.week_start_date not in week_map:
            week_map[entry.week_start_date] = []
        week_map[entry.week_start_date].append(entry)
    
    # Create summaries
    summaries = []
    
    for week_start_str, entries in week_map.items():
        try:
            week_start = datetime.fromisoformat(week_start_str).date()
            week_end = week_start + timedelta(days=6)
            
            # Count applications (only application_submitted events)
            applications_count = sum(
                1 for e in entries
                if e.event_type == "application_submitted"
            )
            
            missed_requirement = applications_count < required_applications_per_week
            
            summary = WeeklyComplianceSummary(
                week_start_date=week_start_str,
                week_end_date=week_end.isoformat(),
                applications_count=applications_count,
                required_count=required_applications_per_week,
                missed_requirement=missed_requirement,
                evidence_entries=entries,
            )
            summaries.append(summary)
        except Exception:
            # Skip malformed week dates
            continue
    
    # Sort by week_start_date (newest first)
    summaries.sort(key=lambda s: s.week_start_date, reverse=True)
    
    return summaries

