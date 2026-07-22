# database registry sslmode
#
# Revision ID: 20260721_0002
# Revises: 20260713_0001
# Create Date: 2026-07-21 00:00:00.000000
import os
import sqlalchemy as sa
from alembic import op
from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "20260721_0002"
down_revision: str | Sequence[str] | None = "20260713_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DATABASE_SSL_MODES = {"disable", "allow", "prefer", "require", "verify-ca", "verify-full"}


def upgrade() -> None:
    """Store PostgreSQL SSL mode on each database registry."""

    # Preserve the removed deployment setting once for existing registry rows.
    sslmode = os.getenv("DATABASE_SSLMODE", "require")
    if sslmode not in DATABASE_SSL_MODES:
        sslmode = "require"

    # Add registry-owned SSL mode while preserving existing connection behavior.
    op.add_column(
        "database_registries",
        sa.Column("sslmode", sa.String(length=16), nullable=False, server_default=sslmode),
    )

    # SQLite cannot drop column defaults without rebuilding the table.
    bind = op.get_bind()
    if bind.dialect.name != "sqlite":
        op.alter_column(
            "database_registries",
            "sslmode",
            existing_type=sa.String(length=16),
            existing_nullable=False,
            server_default=None,
        )


def downgrade() -> None:
    """Remove PostgreSQL SSL mode from database registries."""

    # Drop the registry field when moving back to the global environment setting.
    op.drop_column("database_registries", "sslmode")
