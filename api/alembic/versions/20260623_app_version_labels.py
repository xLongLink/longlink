"""Store build version labels on applications.

Revision ID: 20260623_app_version_labels
Revises: 20260623_database_storage_slug
Create Date: 2026-06-23 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "20260623_app_version_labels"
down_revision = "20260623_database_storage_slug"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add nullable version labels to the applications table."""

    op.add_column("applications", sa.Column("version", sa.String(length=20), nullable=True))
    op.add_column("applications", sa.Column("sdk_version", sa.String(length=20), nullable=True))


def downgrade() -> None:
    """Remove application version label columns."""

    op.drop_column("applications", "sdk_version")
    op.drop_column("applications", "version")
