import sqlalchemy as sa
from alembic import op

revision = "20260711_drop_storage_bucket_prefix"
down_revision = "20260711_drop_storage_protocol"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Remove the global LongLink prefix from assigned storage bucket names."""

    # Existing assigned bucket names keep the organization/application suffixes.
    op.execute(
        sa.text(
            """
            UPDATE organizations
            SET shared_storage_bucket_name = SUBSTR(shared_storage_bucket_name, 10)
            WHERE shared_storage_bucket_name LIKE 'longlink-%'
            """
        )
    )
    op.execute(
        sa.text(
            """
            UPDATE applications
            SET storage_bucket_name = SUBSTR(storage_bucket_name, 10)
            WHERE storage_bucket_name LIKE 'longlink-%'
            """
        )
    )


def downgrade() -> None:
    """Restore the previous global LongLink prefix on assigned storage bucket names."""

    # Reapply the old generated prefix for deployments rolling back this schema.
    op.execute(
        sa.text(
            """
            UPDATE organizations
            SET shared_storage_bucket_name = 'longlink-' || shared_storage_bucket_name
            WHERE shared_storage_bucket_name IS NOT NULL
            AND shared_storage_bucket_name NOT LIKE 'longlink-%'
            """
        )
    )
    op.execute(
        sa.text(
            """
            UPDATE applications
            SET storage_bucket_name = 'longlink-' || storage_bucket_name
            WHERE storage_bucket_name IS NOT NULL
            AND storage_bucket_name NOT LIKE 'longlink-%'
            """
        )
    )
