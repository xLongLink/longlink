"""Rename location display fields to name and slug.

Revision ID: 20260621_rename_location_name_to_slug
Revises: 20260620_add_org_avatar
Create Date: 2026-06-21 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260621_rename_location_name_to_slug"
down_revision = "20260620_add_org_avatar"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Rename the stored location columns to match the new API shape."""

    with op.batch_alter_table("locations") as batch_op:
        batch_op.alter_column("name", new_column_name="slug", existing_type=sa.String(length=128))
        batch_op.alter_column(
            "display_name",
            new_column_name="name",
            existing_type=sa.String(length=255),
        )


def downgrade() -> None:
    """Restore the previous display_name/name column layout."""

    with op.batch_alter_table("locations") as batch_op:
        batch_op.alter_column(
            "name",
            new_column_name="display_name",
            existing_type=sa.String(length=255),
        )
        batch_op.alter_column("slug", new_column_name="name", existing_type=sa.String(length=128))
