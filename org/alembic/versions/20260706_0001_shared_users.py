"""Create shared users schema.

Revision ID: 20260706_0001
Revises:
Create Date: 2026-07-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260706_0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the tenant shared schema and users table."""

    op.execute("CREATE SCHEMA IF NOT EXISTS shared")
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("avatar", sa.String(length=2048), server_default="", nullable=False),
        sa.Column("role_name", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        schema="shared",
    )

    # Preserve existing organization users from the legacy public.users table when present.
    op.execute(
        """
        DO $$
        BEGIN
            IF to_regclass('public.users') IS NOT NULL THEN
                INSERT INTO shared.users (id, name, email, avatar, role_name, created_at, updated_at, deleted_at)
                SELECT id, name, email, avatar, role_name, created_at, updated_at, deleted_at
                FROM public.users
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    email = EXCLUDED.email,
                    avatar = EXCLUDED.avatar,
                    role_name = EXCLUDED.role_name,
                    created_at = EXCLUDED.created_at,
                    updated_at = EXCLUDED.updated_at,
                    deleted_at = EXCLUDED.deleted_at;
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    """Drop the tenant shared schema."""

    op.drop_table("users", schema="shared")
    op.execute("DROP SCHEMA IF EXISTS shared")
