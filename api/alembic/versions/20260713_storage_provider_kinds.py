import sqlalchemy as sa
from alembic import op

revision = "20260713_storage_provider_kinds"
down_revision = "20260713_application_storage_runtime_credentials"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Rename generic S3 storage registries to provider-specific MinIO registries."""

    op.execute(sa.text("UPDATE storage_registries SET kind = 'minio' WHERE kind = 's3'"))


def downgrade() -> None:
    """Restore the previous generic S3 storage registry kind."""

    op.execute(sa.text("UPDATE storage_registries SET kind = 's3' WHERE kind = 'minio'"))
