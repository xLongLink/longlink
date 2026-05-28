"""Drop the compute registry name column.

Revision ID: 20260527_drop_compute_registry_name
Revises:
Create Date: 2026-05-27 00:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260527_drop_compute_registry_name"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Remove the unused compute registry name column."""

    # Rebuild the table without the deprecated name column.
    with op.batch_alter_table("compute_registries") as batch_op:
        batch_op.drop_column("name")


def downgrade() -> None:
    """Restore the compute registry name column as nullable data."""

    # The original values cannot be reconstructed after the drop.
    with op.batch_alter_table("compute_registries") as batch_op:
        batch_op.add_column(sa.Column("name", sa.String(length=128), nullable=True))
