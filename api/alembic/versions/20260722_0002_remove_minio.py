# remove MinIO storage support
#
# Revision ID: 20260722_0002
# Revises: 20260713_0001
# Create Date: 2026-07-22 00:00:00.000000
import sqlalchemy as sa
from alembic import op
from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "20260722_0002"
down_revision: str | Sequence[str] | None = "20260713_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Remove development-only storage provider credentials."""

    # Refuse to reinterpret an existing MinIO registry as Exoscale infrastructure.
    connection = op.get_bind()
    count = connection.execute(
        sa.text("SELECT COUNT(*) FROM storage_registries WHERE kind = :kind"),
        {"kind": "minio"},
    ).scalar_one()
    if count:
        raise RuntimeError("Remove MinIO storage registries before upgrading")

    # Exoscale provisioning credentials belong to Platform environment settings.
    with op.batch_alter_table("storage_registries") as batch_op:
        batch_op.drop_column("access_key_id")
        batch_op.drop_column("secret_access_key")


def downgrade() -> None:
    """Restore nullable storage registry credential columns."""

    # Older releases require these columns for development-only storage registries.
    with op.batch_alter_table("storage_registries") as batch_op:
        batch_op.add_column(sa.Column("access_key_id", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("secret_access_key", sa.String(length=255), nullable=True))
