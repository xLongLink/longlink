import sqlalchemy as sa
from alembic import op

revision = "20260712_drop_compute_kind"
down_revision = "20260711_registry_location_uniqueness"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Remove the redundant compute backend kind column."""

    # Inspect columns so partially migrated databases can safely converge.
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("compute_registries")}
    if "kind" not in existing_columns:
        return

    # Compute registries are Kubernetes-only, so the discriminator is no longer useful.
    with op.batch_alter_table("compute_registries") as batch_op:
        batch_op.drop_column("kind")


def downgrade() -> None:
    """Restore the previous compute backend kind column."""

    # Inspect columns so downgrades do not recreate an existing column.
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("compute_registries")}
    if "kind" in existing_columns:
        return

    # Existing rows downgrade to the only compute backend kind the platform supported.
    with op.batch_alter_table("compute_registries") as batch_op:
        batch_op.add_column(
            sa.Column(
                "kind",
                sa.Enum("kubernetes", name="compute_kind_enum", native_enum=False),
                nullable=False,
                server_default="kubernetes",
            )
        )
