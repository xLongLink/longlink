"""Add description to apps.

Revision ID: 20260609_add_app_description
Revises: 20260608_add_location_country
Create Date: 2026-06-09 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260609_add_app_description"
down_revision = "20260608_add_location_country"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add the optional description column to apps."""

    op.add_column("apps", sa.Column("description", sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Remove the description column from apps."""

    op.drop_column("apps", "description")
