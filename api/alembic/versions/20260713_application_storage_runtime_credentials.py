import sqlalchemy as sa
from alembic import op

revision = "20260713_application_storage_runtime_credentials"
down_revision = "20260712_organization_shared_schema_url"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Store application runtime storage credential metadata."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("applications")}

    with op.batch_alter_table("applications") as batch_op:
        if "storage_runtime_key_id" not in columns:
            batch_op.add_column(sa.Column("storage_runtime_key_id", sa.String(length=255), nullable=True))

        if "storage_runtime_role_id" not in columns:
            batch_op.add_column(sa.Column("storage_runtime_role_id", sa.String(length=255), nullable=True))

        if "storage_runtime_secret_access_key" not in columns:
            batch_op.add_column(sa.Column("storage_runtime_secret_access_key", sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Remove application runtime storage credential metadata."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("applications")}

    with op.batch_alter_table("applications") as batch_op:
        if "storage_runtime_secret_access_key" in columns:
            batch_op.drop_column("storage_runtime_secret_access_key")

        if "storage_runtime_role_id" in columns:
            batch_op.drop_column("storage_runtime_role_id")

        if "storage_runtime_key_id" in columns:
            batch_op.drop_column("storage_runtime_key_id")
