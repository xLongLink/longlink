import sqlalchemy as sa
from alembic import op

revision = "20260711_drop_storage_protocol"
down_revision = "20260711_compute_gateway_url"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Remove redundant storage protocol scheme from registries."""

    # Inspect columns so the migration is safe in partially migrated environments.
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("storage_registries")}

    # Endpoint URLs already include the transport scheme.
    with op.batch_alter_table("storage_registries") as batch_op:
        if "protocol" in existing_columns:
            batch_op.drop_column("protocol")


def downgrade() -> None:
    """Restore storage protocol scheme on registries."""

    # Inspect columns so downgrade does not recreate columns that already exist.
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("storage_registries")}

    # Rebuild the legacy protocol field from the endpoint URL scheme.
    with op.batch_alter_table("storage_registries") as batch_op:
        if "protocol" not in existing_columns:
            batch_op.add_column(sa.Column("protocol", sa.String(length=16), nullable=True))

    op.execute(
        "UPDATE storage_registries SET protocol = CASE "
        "WHEN endpoint_url LIKE 'http://%' THEN 'http' "
        "ELSE 'https' END "
        "WHERE protocol IS NULL"
    )

    with op.batch_alter_table("storage_registries") as batch_op:
        batch_op.alter_column("protocol", existing_type=sa.String(length=16), nullable=False)
