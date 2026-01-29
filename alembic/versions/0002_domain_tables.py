"""domain tables (logs, queue, evidence, audit, runs)

Revision ID: 0002_domain_tables
Revises: 0001_tenants_and_users
Create Date: 2026-01-28
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0002_domain_tables"
down_revision = "0001_tenants_and_users"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "job_activity_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("tenant_id", sa.String(length=64), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("claimant_id", sa.String(length=128), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ts", sa.String(length=64), nullable=False),
        sa.Column("run_id", sa.String(length=128), nullable=True),
        sa.Column("site", sa.String(length=64), nullable=False),
        sa.Column("job_title", sa.Text(), nullable=False),
        sa.Column("company", sa.Text(), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
    )

    op.create_table(
        "job_queue_items",
        sa.Column("id", sa.String(length=128), primary_key=True),
        sa.Column("tenant_id", sa.String(length=64), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("claimant_id", sa.String(length=128), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("platform", sa.String(length=64), nullable=False, server_default="unknown"),
        sa.Column("title", sa.Text(), nullable=False, server_default=""),
        sa.Column("company", sa.Text(), nullable=False, server_default=""),
        sa.Column("location", sa.Text(), nullable=True),
        sa.Column("url", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("discovered_at", sa.String(length=64), nullable=True),
        sa.Column("approved_at", sa.String(length=64), nullable=True),
        sa.Column("rejected_at", sa.String(length=64), nullable=True),
        sa.Column("raw", sa.JSON(), nullable=False),
        sa.UniqueConstraint("tenant_id", "claimant_id", "id", name="uq_job_queue_item_scoped"),
    )

    op.create_table(
        "evidence_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("tenant_id", sa.String(length=64), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("claimant_id", sa.String(length=128), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("timestamp", sa.String(length=64), nullable=False),
        sa.Column("week_start_date", sa.String(length=32), nullable=True),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("job_id", sa.String(length=128), nullable=True),
        sa.Column("job_title", sa.Text(), nullable=True),
        sa.Column("company", sa.Text(), nullable=True),
        sa.Column("platform", sa.String(length=64), nullable=True),
        sa.Column("url", sa.Text(), nullable=True),
    )

    op.create_table(
        "audit_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("tenant_id", sa.String(length=64), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ts", sa.String(length=64), nullable=False),
        sa.Column("actor_id", sa.String(length=128), nullable=False),
        sa.Column("actor_email", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("action", sa.String(length=128), nullable=False),
        sa.Column("resource_type", sa.String(length=64), nullable=False),
        sa.Column("resource_id", sa.String(length=128), nullable=False),
        sa.Column("details", sa.JSON(), nullable=True),
    )

    op.create_table(
        "run_states",
        sa.Column("run_id", sa.String(length=128), primary_key=True),
        sa.Column("tenant_id", sa.String(length=64), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("claimant_id", sa.String(length=128), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("run_states")
    op.drop_table("audit_events")
    op.drop_table("evidence_events")
    op.drop_table("job_queue_items")
    op.drop_table("job_activity_events")

