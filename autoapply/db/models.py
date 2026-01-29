"""SQLAlchemy models (SaaS foundation).

These are the minimal tables needed for multi-tenant auth/identity.
Domain tables (jobs, evidence, audit, runs) will be added in later phases.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    DateTime,
    String,
    Text,
    ForeignKey,
    UniqueConstraint,
    CheckConstraint,
    Integer,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("name", name="uq_tenants_name"),
    )


class UserRow(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email"),
        CheckConstraint("role IN ('claimant','coach','admin')", name="ck_users_role"),
    )


class ClaimantSkipRow(Base):
    __tablename__ = "claimant_skip"

    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(128), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class UserAssignmentRow(Base):
    __tablename__ = "user_assignments"

    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id", ondelete="CASCADE"), primary_key=True)
    coach_id: Mapped[str] = mapped_column(String(128), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    claimant_id: Mapped[str] = mapped_column(String(128), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


def _json_type():
    """Use JSONB on Postgres, JSON elsewhere."""
    return JSONB().with_variant(JSON(), "sqlite")


class JobActivityEventRow(Base):
    __tablename__ = "job_activity_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    claimant_id: Mapped[str] = mapped_column(String(128), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    ts: Mapped[str] = mapped_column(String(64), nullable=False)  # ISO string for compat
    run_id: Mapped[str] = mapped_column(String(128), nullable=True, default="")
    site: Mapped[str] = mapped_column(String(64), nullable=False)
    job_title: Mapped[str] = mapped_column(Text, nullable=False)
    company: Mapped[str] = mapped_column(Text, nullable=False, default="")
    url: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")


class JobQueueItemRow(Base):
    __tablename__ = "job_queue_items"

    id: Mapped[str] = mapped_column(String(128), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    claimant_id: Mapped[str] = mapped_column(String(128), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    platform: Mapped[str] = mapped_column(String(64), nullable=False, default="unknown")
    title: Mapped[str] = mapped_column(Text, nullable=False, default="")
    company: Mapped[str] = mapped_column(Text, nullable=False, default="")
    location: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    discovered_at: Mapped[str | None] = mapped_column(String(64), nullable=True)
    approved_at: Mapped[str | None] = mapped_column(String(64), nullable=True)
    rejected_at: Mapped[str | None] = mapped_column(String(64), nullable=True)
    raw: Mapped[dict] = mapped_column(_json_type(), nullable=False, default=dict)

    __table_args__ = (
        UniqueConstraint("tenant_id", "claimant_id", "id", name="uq_job_queue_item_scoped"),
    )


class EvidenceEventRow(Base):
    __tablename__ = "evidence_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    claimant_id: Mapped[str] = mapped_column(String(128), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    timestamp: Mapped[str] = mapped_column(String(64), nullable=False)
    week_start_date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    job_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    job_title: Mapped[str | None] = mapped_column(Text, nullable=True)
    company: Mapped[str | None] = mapped_column(Text, nullable=True)
    platform: Mapped[str | None] = mapped_column(String(64), nullable=True)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)


class AuditEventRow(Base):
    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    ts: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(128), nullable=False)
    actor_email: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(64), nullable=False)
    resource_id: Mapped[str] = mapped_column(String(128), nullable=False)
    details: Mapped[dict | None] = mapped_column(_json_type(), nullable=True)


class RunStateRow(Base):
    __tablename__ = "run_states"

    run_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    claimant_id: Mapped[str] = mapped_column(String(128), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    payload: Mapped[dict] = mapped_column(_json_type(), nullable=False, default=dict)


class ClaimantConfigRow(Base):
    """Per-claimant config (replaces single config.yaml in SaaS mode)."""

    __tablename__ = "claimant_configs"

    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id", ondelete="CASCADE"), primary_key=True)
    claimant_id: Mapped[str] = mapped_column(String(128), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    config_json: Mapped[dict] = mapped_column(_json_type(), nullable=False, default=dict)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class AutomationRunRow(Base):
    """Queued automation run (worker consumes; replaces in-process thread)."""

    __tablename__ = "automation_runs"

    run_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    claimant_id: Mapped[str] = mapped_column(String(128), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")  # pending, running, completed, failed, cancelled
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

