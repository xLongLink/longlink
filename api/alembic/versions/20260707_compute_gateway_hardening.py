import sqlalchemy as sa
from alembic import op

revision = "20260707_compute_gateway_hardening"
down_revision = "20260706_application_digest"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Store gateway TLS and LoadBalancer settings for compute registries."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("compute_registries")}

    with op.batch_alter_table("compute_registries") as batch_op:
        if "gateway_tls_key" not in existing_columns:
            batch_op.add_column(sa.Column("gateway_tls_key", sa.Text(), nullable=True))
        if "gateway_tls_certificate" not in existing_columns:
            batch_op.add_column(sa.Column("gateway_tls_certificate", sa.Text(), nullable=True))
        if "gateway_load_balancer_ip" not in existing_columns:
            batch_op.add_column(sa.Column("gateway_load_balancer_ip", sa.String(length=255), nullable=True))

    existing_indexes = {index["name"] for index in inspector.get_indexes("compute_registries")}
    if "ix_compute_registries_proxy_secret" not in existing_indexes:
        op.create_index("ix_compute_registries_proxy_secret", "compute_registries", ["proxy_secret"])


def downgrade() -> None:
    """Remove compute gateway hardening settings."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("compute_registries")}
    existing_indexes = {index["name"] for index in inspector.get_indexes("compute_registries")}

    if "ix_compute_registries_proxy_secret" in existing_indexes:
        op.drop_index("ix_compute_registries_proxy_secret", table_name="compute_registries")

    with op.batch_alter_table("compute_registries") as batch_op:
        if "gateway_load_balancer_ip" in existing_columns:
            batch_op.drop_column("gateway_load_balancer_ip")
        if "gateway_tls_certificate" in existing_columns:
            batch_op.drop_column("gateway_tls_certificate")
        if "gateway_tls_key" in existing_columns:
            batch_op.drop_column("gateway_tls_key")
