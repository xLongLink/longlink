import sqlalchemy as sa
from alembic import op

revision = "20260711_remove_compute_ingress_name"
down_revision = "20260708_single_database_endpoint"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Remove unused compute ingress resource names."""

    # Inspect the existing table so the migration is safe to rerun in partially migrated environments.
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("compute_registries")}

    # The platform now derives gateway resources from compute constants instead of stored registry metadata.
    with op.batch_alter_table("compute_registries") as batch_op:
        if "ingress_name" in existing_columns:
            batch_op.drop_column("ingress_name")


def downgrade() -> None:
    """Restore compute ingress resource names."""

    # Inspect the existing table so downgrade remains safe if the column was already restored manually.
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("compute_registries")}

    # Restore the old persisted metadata value for existing registries.
    if "ingress_name" not in existing_columns:
        with op.batch_alter_table("compute_registries") as batch_op:
            batch_op.add_column(sa.Column("ingress_name", sa.String(length=255), nullable=True))

        op.execute("UPDATE compute_registries SET ingress_name = 'longlink-gateway' WHERE ingress_name IS NULL")

        with op.batch_alter_table("compute_registries") as batch_op:
            batch_op.alter_column("ingress_name", existing_type=sa.String(length=255), nullable=False)
