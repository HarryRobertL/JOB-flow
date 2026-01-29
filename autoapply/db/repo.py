"""DB repository helpers for SaaS mode.

These functions are used only when DATABASE_URL is set.
They are intentionally small and mirror existing file-backed shapes.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional, Sequence

from sqlalchemy import select, delete, and_, desc

from autoapply.db.session import db_session
from autoapply.db.models import (
    JobActivityEventRow,
    JobQueueItemRow,
    EvidenceEventRow,
    AuditEventRow,
    RunStateRow,
    ClaimantConfigRow,
    AutomationRunRow,
)


def db_enabled() -> bool:
    try:
        from autoapply.db.settings import get_db_settings

        return bool(get_db_settings().database_url)
    except Exception:
        return False


# ---- Logs (job_activity_events) -------------------------------------------------


def insert_log_row(*, tenant_id: str, claimant_id: str, row: dict[str, Any]) -> None:
    with db_session() as s:
        ev = JobActivityEventRow(
            tenant_id=tenant_id,
            claimant_id=claimant_id,
            ts=str(row.get("ts") or datetime.utcnow().isoformat()),
            run_id=str(row.get("run_id") or ""),
            site=str(row.get("site") or ""),
            job_title=str(row.get("job_title") or ""),
            company=str(row.get("company") or ""),
            url=str(row.get("url") or ""),
            status=str(row.get("status") or ""),
            notes=str(row.get("notes") or ""),
        )
        s.add(ev)
        s.commit()


def list_log_rows(*, tenant_id: str, claimant_id: Optional[str] = None, limit: int = 500) -> list[dict[str, Any]]:
    with db_session() as s:
        q = select(JobActivityEventRow).where(JobActivityEventRow.tenant_id == tenant_id)
        if claimant_id:
            q = q.where(JobActivityEventRow.claimant_id == claimant_id)
        q = q.order_by(desc(JobActivityEventRow.id)).limit(limit)
        rows = s.execute(q).scalars().all()
        # Return oldest first to match CSV ordering expectations in some parts of the app.
        rows = list(reversed(rows))
        return [
            {
                "ts": r.ts,
                "run_id": r.run_id,
                "claimant_id": r.claimant_id,
                "site": r.site,
                "job_title": r.job_title,
                "company": r.company,
                "url": r.url,
                "status": r.status,
                "notes": r.notes,
            }
            for r in rows
        ]


# ---- Jobs queue (job_queue_items) ------------------------------------------------


def upsert_job_queue_items(*, tenant_id: str, claimant_id: str, items: Sequence[dict[str, Any]]) -> None:
    with db_session() as s:
        for item in items:
            job_id = str(item.get("id") or "")
            if not job_id:
                continue
            existing = s.get(JobQueueItemRow, job_id)
            if existing is None:
                existing = JobQueueItemRow(
                    id=job_id,
                    tenant_id=tenant_id,
                    claimant_id=claimant_id,
                )
                s.add(existing)
            existing.platform = str(item.get("platform") or item.get("site") or "unknown")
            existing.title = str(item.get("title") or item.get("job_title") or "")
            existing.company = str(item.get("company") or "")
            existing.location = item.get("location")
            existing.url = item.get("url")
            existing.status = str(item.get("status") or "pending")
            existing.discovered_at = item.get("discoveredAt") or item.get("discovered_at")
            existing.approved_at = item.get("approvedAt") or item.get("approved_at")
            existing.rejected_at = item.get("rejectedAt") or item.get("rejected_at")
            existing.raw = dict(item)
        s.commit()


def list_job_queue_items(*, tenant_id: str, claimant_id: str) -> list[dict[str, Any]]:
    with db_session() as s:
        q = (
            select(JobQueueItemRow)
            .where(and_(JobQueueItemRow.tenant_id == tenant_id, JobQueueItemRow.claimant_id == claimant_id))
            .order_by(desc(JobQueueItemRow.discovered_at), desc(JobQueueItemRow.id))
        )
        rows = s.execute(q).scalars().all()
        return [dict(r.raw or {}) for r in rows]


def update_job_status(*, tenant_id: str, claimant_id: str, job_id: str, status: str, ts_key: str, ts_val: str) -> None:
    with db_session() as s:
        row = s.get(JobQueueItemRow, job_id)
        if row is None:
            return
        if row.tenant_id != tenant_id or row.claimant_id != claimant_id:
            return
        row.status = status
        if ts_key == "approvedAt":
            row.approved_at = ts_val
        if ts_key == "rejectedAt":
            row.rejected_at = ts_val
        raw = dict(row.raw or {})
        raw["status"] = status
        raw[ts_key] = ts_val
        row.raw = raw
        s.commit()


# ---- Evidence (evidence_events) -------------------------------------------------


def insert_evidence_event(*, tenant_id: str, row: dict[str, Any]) -> None:
    with db_session() as s:
        ev = EvidenceEventRow(
            tenant_id=tenant_id,
            claimant_id=str(row.get("claimant_id") or ""),
            timestamp=str(row.get("timestamp") or ""),
            week_start_date=row.get("week_start_date"),
            event_type=str(row.get("event_type") or ""),
            description=str(row.get("description") or ""),
            source=str(row.get("source") or ""),
            job_id=row.get("job_id"),
            job_title=row.get("job_title"),
            company=row.get("company"),
            platform=row.get("platform"),
            url=row.get("url"),
        )
        s.add(ev)
        s.commit()


def query_evidence_events(
    *,
    tenant_id: str,
    claimant_id: Optional[str],
    start_iso: Optional[str] = None,
    end_iso: Optional[str] = None,
) -> list[dict[str, Any]]:
    with db_session() as s:
        q = select(EvidenceEventRow).where(EvidenceEventRow.tenant_id == tenant_id)
        if claimant_id:
            q = q.where(EvidenceEventRow.claimant_id == claimant_id)
        if start_iso:
            q = q.where(EvidenceEventRow.timestamp >= start_iso)
        if end_iso:
            q = q.where(EvidenceEventRow.timestamp <= end_iso)
        q = q.order_by(desc(EvidenceEventRow.id))
        rows = s.execute(q).scalars().all()
        rows = list(reversed(rows))
        return [
            {
                "timestamp": r.timestamp,
                "claimant_id": r.claimant_id,
                "event_type": r.event_type,
                "description": r.description,
                "week_start_date": r.week_start_date,
                "source": r.source,
                "job_id": r.job_id,
                "job_title": r.job_title,
                "company": r.company,
                "platform": r.platform,
                "url": r.url,
            }
            for r in rows
        ]


# ---- Audit (audit_events) -------------------------------------------------------


def insert_audit_event(*, tenant_id: str, entry: dict[str, Any]) -> None:
    with db_session() as s:
        ev = AuditEventRow(
            tenant_id=tenant_id,
            ts=str(entry.get("ts") or datetime.utcnow().isoformat()),
            actor_id=str(entry.get("actor_id") or ""),
            actor_email=str(entry.get("actor_email") or ""),
            action=str(entry.get("action") or ""),
            resource_type=str(entry.get("resource_type") or ""),
            resource_id=str(entry.get("resource_id") or ""),
            details=entry.get("details"),
        )
        s.add(ev)
        s.commit()


def list_audit_events(
    *,
    tenant_id: str,
    from_iso: Optional[str] = None,
    to_iso: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    with db_session() as s:
        q = select(AuditEventRow).where(AuditEventRow.tenant_id == tenant_id)
        if from_iso:
            q = q.where(AuditEventRow.ts >= from_iso)
        if to_iso:
            q = q.where(AuditEventRow.ts <= to_iso)
        if action:
            q = q.where(AuditEventRow.action == action)
        q = q.order_by(desc(AuditEventRow.id)).offset(offset).limit(limit)
        rows = s.execute(q).scalars().all()
        return [
            {
                "ts": r.ts,
                "actor_id": r.actor_id,
                "actor_email": r.actor_email,
                "action": r.action,
                "resource_type": r.resource_type,
                "resource_id": r.resource_id,
                "details": r.details,
            }
            for r in rows
        ]


# ---- Run state (run_states) -----------------------------------------------------


def write_run_state(*, tenant_id: str, claimant_id: str, run_id: str, payload: dict[str, Any]) -> None:
    with db_session() as s:
        row = s.get(RunStateRow, run_id)
        if row is None:
            row = RunStateRow(run_id=run_id, tenant_id=tenant_id, claimant_id=claimant_id, payload=dict(payload))
            s.add(row)
        else:
            row.payload = dict(payload)
        s.commit()


def read_run_state(*, tenant_id: str, claimant_id: str) -> Optional[dict[str, Any]]:
    with db_session() as s:
        q = (
            select(RunStateRow)
            .where(and_(RunStateRow.tenant_id == tenant_id, RunStateRow.claimant_id == claimant_id))
            .order_by(desc(RunStateRow.run_id))
            .limit(1)
        )
        row = s.execute(q).scalars().first()
        if row is None:
            return None
        return dict(row.payload or {})


# ---- Claimant config (claimant_configs) -----------------------------------------


def get_claimant_config(*, tenant_id: str, claimant_id: str) -> Optional[dict[str, Any]]:
    """Return config dict for claimant, or None if not stored."""
    with db_session() as s:
        row = s.get(ClaimantConfigRow, (tenant_id, claimant_id))
        if row is None:
            return None
        return dict(row.config_json or {})


def upsert_claimant_config(*, tenant_id: str, claimant_id: str, config_dict: dict[str, Any]) -> None:
    """Insert or update claimant config. config_dict should be AppConfig.model_dump() compatible."""
    with db_session() as s:
        row = s.get(ClaimantConfigRow, (tenant_id, claimant_id))
        if row is None:
            row = ClaimantConfigRow(
                tenant_id=tenant_id,
                claimant_id=claimant_id,
                config_json=dict(config_dict),
                version=1,
            )
            s.add(row)
        else:
            row.config_json = dict(config_dict)
            row.version = (row.version or 1) + 1
        s.commit()


# ---- Automation runs (queue for worker) ----------------------------------------


def enqueue_automation_run(*, tenant_id: str, claimant_id: str, run_id: str) -> None:
    """Insert a pending automation run. Worker will pick it up."""
    with db_session() as s:
        row = AutomationRunRow(
            run_id=run_id,
            tenant_id=tenant_id,
            claimant_id=claimant_id,
            status="pending",
        )
        s.add(row)
        s.commit()


def count_running_for_claimant(claimant_id: str) -> int:
    """Return number of runs with status=running for this claimant."""
    with db_session() as s:
        q = select(AutomationRunRow).where(
            and_(AutomationRunRow.claimant_id == claimant_id, AutomationRunRow.status == "running")
        )
        return len(s.execute(q).scalars().all())


def count_running_for_tenant(tenant_id: str) -> int:
    """Return number of runs with status=running for this tenant."""
    with db_session() as s:
        q = select(AutomationRunRow).where(
            and_(AutomationRunRow.tenant_id == tenant_id, AutomationRunRow.status == "running")
        )
        return len(s.execute(q).scalars().all())


def get_next_pending_run(
    *,
    max_per_claimant: int = 1,
    max_per_tenant: int = 10,
) -> Optional[tuple[str, str, str]]:
    """
    Return (run_id, tenant_id, claimant_id) for a pending run that can be started
    without exceeding concurrency limits. Returns None if no such run.
    """
    with db_session() as s:
        q = (
            select(AutomationRunRow)
            .where(AutomationRunRow.status == "pending")
            .order_by(AutomationRunRow.created_at)
        )
        pending = s.execute(q).scalars().all()
        for row in pending:
            if count_running_for_claimant(row.claimant_id) >= max_per_claimant:
                continue
            if count_running_for_tenant(row.tenant_id) >= max_per_tenant:
                continue
            return (row.run_id, row.tenant_id, row.claimant_id)
    return None


def claim_automation_run(run_id: str, started_at: Optional[datetime] = None) -> bool:
    """Set status to 'running' only if currently 'pending'. Returns True if claimed."""
    with db_session() as s:
        row = s.get(AutomationRunRow, run_id)
        if row is None or row.status != "pending":
            return False
        row.status = "running"
        if started_at is not None:
            row.started_at = started_at
        s.commit()
        return True


def set_automation_run_status(
    run_id: str,
    status: str,
    *,
    started_at: Optional[datetime] = None,
    finished_at: Optional[datetime] = None,
) -> None:
    """Update automation run status and timestamps."""
    with db_session() as s:
        row = s.get(AutomationRunRow, run_id)
        if row is None:
            return
        row.status = status
        if started_at is not None:
            row.started_at = started_at
        if finished_at is not None:
            row.finished_at = finished_at
        s.commit()


def get_latest_automation_run_for_claimant(*, tenant_id: str, claimant_id: str) -> Optional[dict[str, Any]]:
    """Return the most recent automation run (any status) for this claimant, or None."""
    with db_session() as s:
        q = (
            select(AutomationRunRow)
            .where(
                and_(
                    AutomationRunRow.tenant_id == tenant_id,
                    AutomationRunRow.claimant_id == claimant_id,
                )
            )
            .order_by(desc(AutomationRunRow.created_at))
            .limit(1)
        )
        row = s.execute(q).scalars().first()
        if row is None:
            return None
        return {
            "run_id": row.run_id,
            "tenant_id": row.tenant_id,
            "claimant_id": row.claimant_id,
            "status": row.status,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "started_at": row.started_at.isoformat() if row.started_at else None,
            "finished_at": row.finished_at.isoformat() if row.finished_at else None,
        }

