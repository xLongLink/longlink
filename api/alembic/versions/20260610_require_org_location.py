"""Require a location for organizations.

Revision ID: 20260610_require_org_location
Revises: 20260609_remove_envs_table
Create Date: 2026-06-10 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260610_require_org_location"
down_revision = "20260609_remove_envs_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Make organization locations mandatory."""

    with op.batch_alter_table("organizations") as batch_op:
        batch_op.alter_column(
            "location_id",
            existing_type=sa.Integer(),
            nullable=False,
        )


def downgrade() -> None:
    """Allow organizations without an attached location again."""

    with op.batch_alter_table("organizations") as batch_op:
        batch_op.alter_column(
            "location_id",
            existing_type=sa.Integer(),
            nullable=True,
        )
