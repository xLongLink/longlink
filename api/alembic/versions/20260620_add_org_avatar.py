"""Add avatar column to organizations table.

Revision ID: 20260620_add_org_avatar
Revises: 20260619_add_app_delete_operation
Create Date: 2026-06-20 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260620_add_org_avatar"
down_revision = "20260619_add_app_delete_operation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add avatar column to organizations."""

    with op.batch_alter_table("organizations") as batch_op:
        batch_op.add_column(sa.Column("avatar", sa.String(length=2048), nullable=True))


def downgrade() -> None:
    """Remove avatar column from organizations."""

    with op.batch_alter_table("organizations") as batch_op:
        batch_op.drop_column("avatar")
