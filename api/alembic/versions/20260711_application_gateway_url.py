import urllib.parse
import sqlalchemy as sa
from alembic import op

revision = "20260711_application_gateway_url"
down_revision = "20260711_remove_compute_ingress_name"
branch_labels = None
depends_on = None


def _origin(value: str) -> str:
    """Return the gateway origin for an ingress host or absolute URL value."""

    stripped_value = value.strip().rstrip("/")
    parsed_value = urllib.parse.urlsplit(stripped_value if "://" in stripped_value else f"https://{stripped_value}")

    # Absolute URL values keep their scheme, host, and optional port.
    if parsed_value.scheme and parsed_value.netloc:
        return f"{parsed_value.scheme}://{parsed_value.netloc}"

    return f"https://{stripped_value}"


def upgrade() -> None:
    """Store the API-facing cluster gateway URL for each application."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("applications")}

    # Add the internal URL column without exposing it in API response schemas.
    with op.batch_alter_table("applications") as batch_op:
        if "gateway_url" not in existing_columns:
            batch_op.add_column(sa.Column("gateway_url", sa.String(length=512), nullable=True))

    applications = sa.table(
        "applications",
        sa.column("id", sa.Uuid()),
        sa.column("compute_registry_id", sa.Uuid()),
        sa.column("gateway_url", sa.String(length=512)),
    )
    compute_registries = sa.table(
        "compute_registries",
        sa.column("id", sa.Uuid()),
        sa.column("ingress_host", sa.String(length=255)),
    )

    rows = bind.execute(
        sa.select(applications.c.id, compute_registries.c.ingress_host)
        .select_from(applications.join(compute_registries, applications.c.compute_registry_id == compute_registries.c.id))
        .where(applications.c.gateway_url.is_(None))
    ).all()

    # Backfill existing application rows from their assigned compute gateway.
    for application_id, ingress_host in rows:
        bind.execute(
            applications.update()
            .where(applications.c.id == application_id)
            .values(gateway_url=f"{_origin(ingress_host)}/api/applications/{application_id}/proxy/")
        )


def downgrade() -> None:
    """Remove stored application gateway URLs."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("applications")}

    # Drop the internal URL column when present.
    with op.batch_alter_table("applications") as batch_op:
        if "gateway_url" in existing_columns:
            batch_op.drop_column("gateway_url")
