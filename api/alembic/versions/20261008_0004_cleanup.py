"""Remove redundant Organization lease identifiers and registry providers."""

import sqlalchemy as sa
from alembic import op

revision = "20261008_0004"
down_revision = "20261007_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Remove redundant persisted fields without discarding historical rows."""

    # Refuse to collapse independently identified activities or multiple rows for one Organization.
    connection = op.get_bind()
    activities = sa.table("organization_activities", sa.column("id", sa.Uuid()), sa.column("organization_id", sa.Uuid()))
    noncanonical = connection.scalar(sa.select(activities.c.id).where(activities.c.id != activities.c.organization_id).limit(1))
    if noncanonical is not None:
        raise RuntimeError("Resolve noncanonical Organization activity rows before upgrading transition leases")

    # Validate registry identities before changing either table on nontransactional DDL backends.
    registries = sa.table("registry_connections", sa.column("provider", sa.String()))
    unsupported = connection.scalar(sa.select(registries.c.provider).where(registries.c.provider != "ghcr").limit(1))
    if unsupported is not None:
        raise RuntimeError("Resolve unsupported registry providers before removing the persisted provider")

    # Name SQLite's reflected unnamed primary key while retaining existing backend constraint names.
    primary_key = sa.inspect(connection).get_pk_constraint("organization_activities")["name"] or "pk_organization_activities"
    with op.batch_alter_table("organization_activities", naming_convention={"pk": "pk_%(table_name)s"}) as batch:
        batch.drop_constraint(primary_key, type_="primary")
        batch.drop_column("id")
        batch.create_primary_key("pk_organization_activities", ["organization_id"])
        batch.drop_index("ix_organization_activities_organization_id")

    # Remove the named enum check so SQLite recreation cannot retain a dropped-column reference.
    checks = {constraint["name"] for constraint in sa.inspect(connection).get_check_constraints("registry_connections")}
    with op.batch_alter_table("registry_connections") as batch:
        if "registry_provider_enum" in checks:
            batch.drop_constraint("registry_provider_enum", type_="check")
        batch.drop_column("provider")


def downgrade() -> None:
    """Restore the previous provider and canonical lease identifiers."""

    # Restore the provider first, backfilling retained rows before removing the temporary default.
    provider = sa.Enum("ghcr", name="registry_provider_enum", native_enum=False, create_constraint=True, validate_strings=True, length=50)
    with op.batch_alter_table("registry_connections") as batch:
        batch.add_column(sa.Column("provider", provider, nullable=False, server_default="ghcr"))
    with op.batch_alter_table("registry_connections") as batch:
        batch.alter_column("provider", existing_type=provider, existing_nullable=False, server_default=None)

    # Populate the restored identifier before making it the non-null primary key.
    with op.batch_alter_table("organization_activities") as batch:
        batch.add_column(sa.Column("id", sa.Uuid(), nullable=True))
    activities = sa.table("organization_activities", sa.column("id", sa.Uuid()), sa.column("organization_id", sa.Uuid()))
    op.execute(activities.update().values(id=activities.c.organization_id))

    # Restore the foreign-key index before replacing the Organization-keyed primary key on MySQL.
    primary_key = sa.inspect(op.get_bind()).get_pk_constraint("organization_activities")["name"] or "pk_organization_activities"
    with op.batch_alter_table("organization_activities", naming_convention={"pk": "pk_%(table_name)s"}) as batch:
        batch.create_index("ix_organization_activities_organization_id", ["organization_id"])
        batch.drop_constraint(primary_key, type_="primary")
        batch.alter_column("id", existing_type=sa.Uuid(), nullable=False)
        batch.create_primary_key("pk_organization_activities", ["id"])
