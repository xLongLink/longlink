import sqlalchemy as sa
from alembic import op

revision = "20260707_storage_bucket_assignments"
down_revision = "20260707_compute_gateway_hardening"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Persist assigned organization and application storage bucket names."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    organization_columns = {column["name"] for column in inspector.get_columns("organizations")}
    application_columns = {column["name"] for column in inspector.get_columns("applications")}

    with op.batch_alter_table("organizations") as batch_op:
        if "shared_storage_bucket_name" not in organization_columns:
            batch_op.add_column(sa.Column("shared_storage_bucket_name", sa.String(length=63), nullable=True))

    with op.batch_alter_table("applications") as batch_op:
        if "storage_bucket_name" not in application_columns:
            batch_op.add_column(sa.Column("storage_bucket_name", sa.String(length=63), nullable=True))

    op.execute(
        sa.text(
            """
            UPDATE organizations
            SET shared_storage_bucket_name = slug || '-shared'
            WHERE shared_storage_bucket_name IS NULL
            """
        )
    )
    op.execute(
        sa.text(
            """
            UPDATE applications
            SET storage_bucket_name = (
                SELECT organizations.slug || '-' || applications.slug
                FROM organizations
                WHERE organizations.id = applications.organization_id
            )
            WHERE storage_bucket_name IS NULL
            """
        )
    )


def downgrade() -> None:
    """Remove assigned storage bucket names."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    organization_columns = {column["name"] for column in inspector.get_columns("organizations")}
    application_columns = {column["name"] for column in inspector.get_columns("applications")}

    with op.batch_alter_table("applications") as batch_op:
        if "storage_bucket_name" in application_columns:
            batch_op.drop_column("storage_bucket_name")

    with op.batch_alter_table("organizations") as batch_op:
        if "shared_storage_bucket_name" in organization_columns:
            batch_op.drop_column("shared_storage_bucket_name")
