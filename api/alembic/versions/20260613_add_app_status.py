"""Add status tracking to apps.

Revision ID: 20260613_add_app_status
Revises: 20260612_add_operation_status_and_error
Create Date: 2026-06-13 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260613_add_app_status"
down_revision = "20260612_add_operation_status_and_error"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add a lifecycle status column to apps."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("apps")}

    if "status" not in columns:
        op.add_column(
            "apps",
            sa.Column("status", sa.String(length=32), nullable=False, server_default="creating"),
        )


def downgrade() -> None:
    """Remove the lifecycle status column from apps."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("apps")}

    if "status" in columns:
        op.drop_column("apps", "status")
