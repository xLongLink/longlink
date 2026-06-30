import sqlalchemy as sa
from alembic import op

revision = "20260624_location_provider"
down_revision = "20260623_application_name_not_unique"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add the provider column to locations."""

    op.add_column(
        "locations",
        sa.Column(
            "provider",
            sa.Enum(
                "local",
                "infomaniak",
                "ovh",
                "scaleway",
                "hetzner",
                "exoscale",
                name="location_provider_enum",
                native_enum=False,
                create_constraint=True,
            ),
            nullable=False,
            server_default=sa.text("'local'"),
        ),
    )


def downgrade() -> None:
    """Remove the provider column from locations."""

    op.drop_column("locations", "provider")
