import sqlalchemy as sa
from alembic import op

revision = "20260624_location_provider"
down_revision = "20260623_application_name_not_unique"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add the provider column to locations."""

    # Define the enum once so the add and alter operations use the same type.
    provider_type = sa.Enum(
        "local",
        "infomaniak",
        "ovh",
        "scaleway",
        "hetzner",
        "exoscale",
        name="location_provider_enum",
        native_enum=False,
        create_constraint=True,
    )

    # Add the column nullable first so existing rows can be backfilled.
    with op.batch_alter_table("locations") as batch_op:
        batch_op.add_column(sa.Column("provider", provider_type, nullable=True))

    # Backfill existing rows before enforcing NOT NULL without a database default.
    op.execute(sa.text("UPDATE locations SET provider = 'local' WHERE provider IS NULL"))

    # Enforce provider presence without keeping a database default.
    with op.batch_alter_table("locations") as batch_op:
        batch_op.alter_column("provider", existing_type=provider_type, nullable=False)


def downgrade() -> None:
    """Remove the provider column from locations."""

    op.drop_column("locations", "provider")
