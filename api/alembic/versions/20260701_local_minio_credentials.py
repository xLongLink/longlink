from alembic import op

revision = "20260701_local_minio_credentials"
down_revision = "20260701_storage_runtime_endpoint"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Update local MinIO credentials for current MinIO password requirements."""

    op.execute(
        """
        UPDATE storage_registries
        SET secret_access_key = 'adminadmin'
        WHERE name = 'local'
        AND access_key_id = 'admin'
        AND secret_access_key = 'admin'
        """
    )


def downgrade() -> None:
    """Restore the previous local MinIO development password."""

    op.execute(
        """
        UPDATE storage_registries
        SET secret_access_key = 'admin'
        WHERE name = 'local'
        AND access_key_id = 'admin'
        AND secret_access_key = 'adminadmin'
        """
    )
