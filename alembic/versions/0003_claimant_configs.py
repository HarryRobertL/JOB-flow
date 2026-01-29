"""claimant_configs table (per-claimant config in SaaS mode)

Revision ID: 0003_claimant_configs
Revises: 0002_domain_tables
Create Date: 2026-01-28

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0003_claimant_configs"
down_revision = "0002_domain_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "claimant_configs",
        sa.Column("tenant_id", sa.String(length=64), sa.ForeignKey("tenants.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("claimant_id", sa.String(length=128), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("config_json", sa.JSON(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("claimant_configs")
