"""Add the operations table.

Revision ID: 20260608_add_operations_table
Revises: 20260604_initial_schema
Create Date: 2026-06-08 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260608_add_operations_table"
down_revision = "20260604_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create the operations table used for long-running work."""

    op.create_table(
        "operations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=100), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("stopped_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    """Drop the operations table."""

    op.drop_table("operations")
