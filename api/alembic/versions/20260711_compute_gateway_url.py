import sqlalchemy as sa
from alembic import op

revision = "20260711_compute_gateway_url"
down_revision = "20260711_operation_single_purpose_kinds"
branch_labels = None
depends_on = None


def _absolute_gateway_url(value: str) -> str:
    """Return an absolute gateway URL for an existing host or URL value."""

    stripped_value = value.strip().rstrip("/")

    # Existing rows may contain bare hosts from the previous registry contract.
    if "://" not in stripped_value:
        return f"https://{stripped_value}"

    return stripped_value


def upgrade() -> None:
    """Rename compute registry ingress hosts to API-facing gateway URLs."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("compute_registries")}

    # Add the new nullable column first so existing rows can be normalized before tightening nullability.
    if "gateway_url" not in existing_columns:
        with op.batch_alter_table("compute_registries") as batch_op:
            batch_op.add_column(sa.Column("gateway_url", sa.String(length=512), nullable=True))

    compute_registries = sa.table(
        "compute_registries",
        sa.column("id", sa.Uuid()),
        sa.column("gateway_url", sa.String(length=512)),
        sa.column("ingress_host", sa.String(length=255)),
    )

    # Backfill from the old host column while preserving absolute development URLs.
    if "ingress_host" in existing_columns:
        rows = bind.execute(sa.select(compute_registries.c.id, compute_registries.c.ingress_host)).all()
        for registry_id, ingress_host in rows:
            bind.execute(
                compute_registries.update()
                .where(compute_registries.c.id == registry_id)
                .values(gateway_url=_absolute_gateway_url(ingress_host))
            )

    # Remove the old contract and make the new URL column authoritative.
    with op.batch_alter_table("compute_registries") as batch_op:
        if "ingress_host" in existing_columns:
            batch_op.drop_column("ingress_host")
        batch_op.alter_column("gateway_url", existing_type=sa.String(length=512), nullable=False)


def downgrade() -> None:
    """Restore compute registry ingress hosts."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("compute_registries")}

    # Restore the old nullable column shape before copying values back.
    if "ingress_host" not in existing_columns:
        with op.batch_alter_table("compute_registries") as batch_op:
            batch_op.add_column(sa.Column("ingress_host", sa.String(length=255), nullable=True))

    compute_registries = sa.table(
        "compute_registries",
        sa.column("id", sa.Uuid()),
        sa.column("gateway_url", sa.String(length=512)),
        sa.column("ingress_host", sa.String(length=255)),
    )

    # The old field accepted absolute URLs, so copy the API-facing value back as-is.
    if "gateway_url" in existing_columns:
        rows = bind.execute(sa.select(compute_registries.c.id, compute_registries.c.gateway_url)).all()
        for registry_id, gateway_url in rows:
            bind.execute(
                compute_registries.update()
                .where(compute_registries.c.id == registry_id)
                .values(ingress_host=gateway_url)
            )

    # Drop the new column and restore the previous non-null old column.
    with op.batch_alter_table("compute_registries") as batch_op:
        if "gateway_url" in existing_columns:
            batch_op.drop_column("gateway_url")
        batch_op.alter_column("ingress_host", existing_type=sa.String(length=255), nullable=False)
