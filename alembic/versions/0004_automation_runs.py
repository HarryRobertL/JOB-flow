"""automation_runs table (queue for background worker)

Revision ID: 0004_automation_runs
Revises: 0003_claimant_configs
Create Date: 2026-01-28

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0004_automation_runs"
down_revision = "0003_claimant_configs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "automation_runs",
        sa.Column("run_id", sa.String(length=128), primary_key=True),
        sa.Column("tenant_id", sa.String(length=64), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("claimant_id", sa.String(length=128), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_automation_runs_status", "automation_runs", ["status"])
    op.create_index("ix_automation_runs_tenant_claimant", "automation_runs", ["tenant_id", "claimant_id"])


def downgrade() -> None:
    op.drop_index("ix_automation_runs_tenant_claimant", table_name="automation_runs")
    op.drop_index("ix_automation_runs_status", table_name="automation_runs")
    op.drop_table("automation_runs")
