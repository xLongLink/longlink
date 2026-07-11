import sqlalchemy as sa
from alembic import op

revision = "20260711_remove_compute_gateway_settings"
down_revision = "20260711_drop_application_gateway_url"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Remove managed gateway settings from compute registries."""

    # Inspect columns so the migration is safe in partially migrated environments.
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("compute_registries")}

    # Managed Kubernetes clusters expose the gateway through provider load-balancer defaults.
    with op.batch_alter_table("compute_registries") as batch_op:
        if "gateway_load_balancer_ip" in existing_columns:
            batch_op.drop_column("gateway_load_balancer_ip")
        if "gateway_tls_certificate" in existing_columns:
            batch_op.drop_column("gateway_tls_certificate")
        if "gateway_tls_key" in existing_columns:
            batch_op.drop_column("gateway_tls_key")


def downgrade() -> None:
    """Restore managed gateway settings on compute registries."""

    # Inspect columns so downgrade does not recreate columns that already exist.
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("compute_registries")}

    # Restore the old nullable settings for compatibility with the previous schema.
    with op.batch_alter_table("compute_registries") as batch_op:
        if "gateway_tls_key" not in existing_columns:
            batch_op.add_column(sa.Column("gateway_tls_key", sa.Text(), nullable=True))
        if "gateway_tls_certificate" not in existing_columns:
            batch_op.add_column(sa.Column("gateway_tls_certificate", sa.Text(), nullable=True))
        if "gateway_load_balancer_ip" not in existing_columns:
            batch_op.add_column(sa.Column("gateway_load_balancer_ip", sa.String(length=255), nullable=True))
