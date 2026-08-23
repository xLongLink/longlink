# unique unleased operations
#
# Revision ID: 20260823_0002
# Revises: 20260713_0001
# Create Date: 2026-08-23
import sqlalchemy as sa
from alembic import op
from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "20260823_0002"
down_revision: str | Sequence[str] | None = "20260713_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Prevent duplicate unleased work for one operation target."""

    # Preserve completed and actively leased history while coalescing ready work.
    op.create_index(
        "uq_operations_unleased_target",
        "operations",
        ["kind", "target_id"],
        unique=True,
        postgresql_where=sa.text("finished_at IS NULL AND lease_expires_at IS NULL"),
        sqlite_where=sa.text("finished_at IS NULL AND lease_expires_at IS NULL"),
    )


def downgrade() -> None:
    """Allow duplicate unleased work again."""

    # Remove the queue deduplication constraint.
    op.drop_index("uq_operations_unleased_target", table_name="operations")
