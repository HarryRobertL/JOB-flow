"""tenants and users

Revision ID: 0001_tenants_and_users
Revises: 
Create Date: 2026-01-28
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0001_tenants_and_users"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tenants",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("name", name="uq_tenants_name"),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.String(length=128), primary_key=True),
        sa.Column("tenant_id", sa.String(length=64), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email"),
        sa.CheckConstraint("role IN ('claimant','coach','admin')", name="ck_users_role"),
    )

    op.create_table(
        "claimant_skip",
        sa.Column("tenant_id", sa.String(length=64), sa.ForeignKey("tenants.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", sa.String(length=128), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "user_assignments",
        sa.Column("tenant_id", sa.String(length=64), sa.ForeignKey("tenants.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("coach_id", sa.String(length=128), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("claimant_id", sa.String(length=128), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("user_assignments")
    op.drop_table("claimant_skip")
    op.drop_table("users")
    op.drop_table("tenants")

