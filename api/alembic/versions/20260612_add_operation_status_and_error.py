"""Add status and error tracking to operations.

Revision ID: 20260612_add_operation_status_and_error
Revises: 20260611_set_location_country_default_ch
Create Date: 2026-06-12 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260612_add_operation_status_and_error"
down_revision = "20260611_set_location_country_default_ch"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add lifecycle status and error tracking to operations."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("operations")}

    if "status" not in columns:
        op.add_column(
            "operations",
            sa.Column("status", sa.String(length=32), nullable=False, server_default="scheduled"),
        )

    if "error" not in columns:
        op.add_column("operations", sa.Column("error", sa.String(length=2000), nullable=True))


def downgrade() -> None:
    """Remove the lifecycle status and error tracking columns."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("operations")}

    if "error" in columns:
        op.drop_column("operations", "error")

    if "status" in columns:
        op.drop_column("operations", "status")
