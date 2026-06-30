import sqlalchemy as sa
from alembic import op

revision = "20260630_database_runtime_connection"
down_revision = "20260630_operation_leases"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Store database addresses reachable from application runtimes."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("database_registries")}

    with op.batch_alter_table("database_registries") as batch_op:
        if "runtime_host" not in existing_columns:
            batch_op.add_column(sa.Column("runtime_host", sa.String(length=255), nullable=True))
        if "runtime_port" not in existing_columns:
            batch_op.add_column(sa.Column("runtime_port", sa.Integer(), nullable=True))

    op.execute("UPDATE database_registries SET runtime_host = host WHERE runtime_host IS NULL")
    op.execute("UPDATE database_registries SET runtime_port = port WHERE runtime_port IS NULL")

    # Existing local seed data used localhost for the API process, but app pods
    # need the k3d host alias to reach the host-published PostgreSQL port.
    op.execute(
        """
        UPDATE database_registries
        SET runtime_host = 'host.k3d.internal'
        WHERE name = 'local'
        AND host IN ('localhost', '127.0.0.1', '::1')
        AND port = 15432
        """
    )

    with op.batch_alter_table("database_registries") as batch_op:
        batch_op.alter_column("runtime_host", existing_type=sa.String(length=255), nullable=False)
        batch_op.alter_column("runtime_port", existing_type=sa.Integer(), nullable=False)



def downgrade() -> None:
    """Remove application runtime database addresses."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("database_registries")}

    with op.batch_alter_table("database_registries") as batch_op:
        if "runtime_port" in existing_columns:
            batch_op.drop_column("runtime_port")
        if "runtime_host" in existing_columns:
            batch_op.drop_column("runtime_host")
