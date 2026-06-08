"""Add country to locations.

Revision ID: 20260608_add_location_country
Revises: 20260608_add_operations_table
Create Date: 2026-06-08 00:00:00.000001
"""

from alembic import op
import sqlalchemy as sa


revision = "20260608_add_location_country"
down_revision = "20260608_add_operations_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add the country column to locations."""

    op.add_column(
        "locations",
        sa.Column("country", sa.String(length=128), nullable=False, server_default=""),
    )


def downgrade() -> None:
    """Remove the country column from locations."""

    op.drop_column("locations", "country")
