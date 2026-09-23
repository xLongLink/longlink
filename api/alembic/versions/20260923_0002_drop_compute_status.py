# drop stale compute status
#
# Revision ID: 20260923_0002
# Revises: 20260713_0001
# Create Date: 2026-09-23
import sqlalchemy as sa
from alembic import op
from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "20260923_0002"
down_revision: str | Sequence[str] | None = "20260713_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Remove the Compute lifecycle column removed from the model."""

    # Earlier deployments ran a version of the initial migration that created this column.
    columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("compute_registries")}
    if "status" in columns:
        op.drop_column("compute_registries", "status")


def downgrade() -> None:
    """Restore the legacy Compute lifecycle column."""

    columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("compute_registries")}
    if "status" not in columns:
        op.add_column(
            "compute_registries",
            sa.Column(
                "status",
                sa.Enum(
                    "creating",
                    "failed",
                    "running",
                    name="compute_status_enum",
                    native_enum=False,
                    create_constraint=True,
                    validate_strings=True,
                ),
                nullable=False,
                server_default="creating",
            ),
        )
        op.alter_column("compute_registries", "status", server_default=None)
