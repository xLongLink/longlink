# remove application actor audit fields
#
# Revision ID: 20260822_0002
# Revises: 20260713_0001
# Create Date: 2026-08-22 00:00:00.000000
from alembic import op
from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "20260822_0002"
down_revision: str | Sequence[str] | None = "20260713_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Remove unused application actor audit fields."""

    # Recreate the table so foreign keys are removed consistently across supported databases.
    with op.batch_alter_table("applications", recreate="always") as batch_op:
        batch_op.drop_column("created_id")
        batch_op.drop_column("updated_id")
        batch_op.drop_column("deleted_id")


def downgrade() -> None:
    """Restore application actor audit fields."""

    raise NotImplementedError("Application actor audit fields cannot be restored")
