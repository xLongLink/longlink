import sqlalchemy as sa
from alembic import op

revision = "20260701_storage_runtime_endpoint"
down_revision = "20260630_database_runtime_connection"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Store storage endpoints reachable from application runtimes."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("storage_registries")}

    with op.batch_alter_table("storage_registries") as batch_op:
        if "runtime_endpoint_url" not in existing_columns:
            batch_op.add_column(sa.Column("runtime_endpoint_url", sa.String(length=255), nullable=True))

    op.execute("UPDATE storage_registries SET runtime_endpoint_url = endpoint_url WHERE runtime_endpoint_url IS NULL")

    # Existing local seed data used localhost for the API process, but app pods
    # need the k3d host alias to reach the host-published MinIO port.
    op.execute(
        """
        UPDATE storage_registries
        SET runtime_endpoint_url = 'http://host.k3d.internal:19000'
        WHERE name = 'local'
        AND endpoint_url IN ('http://localhost:19000', 'http://127.0.0.1:19000')
        """
    )

    with op.batch_alter_table("storage_registries") as batch_op:
        batch_op.alter_column("runtime_endpoint_url", existing_type=sa.String(length=255), nullable=False)


def downgrade() -> None:
    """Remove application runtime storage endpoints."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("storage_registries")}

    with op.batch_alter_table("storage_registries") as batch_op:
        if "runtime_endpoint_url" in existing_columns:
            batch_op.drop_column("runtime_endpoint_url")
