"""Make user and organization avatars non-null.

Revision ID: 20260622_avatar_not_null
Revises: 20260612_initial_schema
Create Date: 2026-06-22 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260622_avatar_not_null"
down_revision = "20260612_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Backfill empty avatar strings and enforce non-null columns."""

    op.execute("UPDATE users SET avatar = '' WHERE avatar IS NULL")
    op.execute("UPDATE organizations SET avatar = '' WHERE avatar IS NULL")
    op.alter_column("users", "avatar", existing_type=sa.String(length=2048), nullable=False, server_default=sa.text("''"))
    op.alter_column(
        "organizations",
        "avatar",
        existing_type=sa.String(length=2048),
        nullable=False,
        server_default=sa.text("''"),
    )


def downgrade() -> None:
    """Restore nullable avatar columns."""

    op.alter_column("organizations", "avatar", existing_type=sa.String(length=2048), nullable=True, server_default=None)
    op.alter_column("users", "avatar", existing_type=sa.String(length=2048), nullable=True, server_default=None)
