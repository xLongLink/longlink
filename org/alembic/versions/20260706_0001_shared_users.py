"""Create shared users table.

Revision ID: 20260706_0001
Revises:
Create Date: 2026-07-06

"""
import sqlalchemy as sa
from typing import Union, Sequence
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260706_0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the tenant shared users table."""

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
    )


def downgrade() -> None:
    """Drop the tenant shared users table."""

    op.drop_table("users")
