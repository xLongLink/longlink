"""Make user and organization avatars non-null.

Revision ID: 20260622_avatar_not_null
Revises: 20260612_initial_schema
Create Date: 2026-06-22 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "20260622_avatar_not_null"
down_revision = "20260612_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Backfill empty avatar strings and enforce non-null columns."""

    op.execute("UPDATE users SET avatar = '' WHERE avatar IS NULL")
    op.execute("UPDATE organizations SET avatar = '' WHERE avatar IS NULL")
    # SQLite needs batch mode for column rebuilds.
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column(
            "avatar",
            existing_type=sa.String(length=2048),
            nullable=False,
            server_default=sa.text("''"),
        )

    with op.batch_alter_table("organizations") as batch_op:
        batch_op.alter_column(
            "avatar",
            existing_type=sa.String(length=2048),
            nullable=False,
            server_default=sa.text("''"),
        )


def downgrade() -> None:
    """Restore nullable avatar columns."""

    # Rebuild the tables in batch mode so SQLite can drop the constraint.
    with op.batch_alter_table("organizations") as batch_op:
        batch_op.alter_column("avatar", existing_type=sa.String(length=2048), nullable=True, server_default=None)

    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("avatar", existing_type=sa.String(length=2048), nullable=True, server_default=None)
