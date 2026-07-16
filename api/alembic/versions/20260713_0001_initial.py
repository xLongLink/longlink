# initial
#
# Revision ID: 20260713_0001
# Revises:
# Create Date: 2026-07-13 16:22:13.474968
import sqlalchemy as sa
import longlink.database.types
from alembic import op
from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "20260713_0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create the initial platform schema."""

    # Create users first because platform resources reference them for audit fields.
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("oidc", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("avatar", sa.String(length=2048), nullable=False),
        sa.Column("created_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("updated_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("deleted_at", longlink.database.types.UTCDateTime(), nullable=True),
        sa.Column("role", sa.Enum("user", "support", "administrator", name="platform_role_enum", native_enum=False), nullable=False),
        sa.Column("theme", sa.Enum("system", "light", "dark", name="theme"), nullable=False),
        sa.Column(
            "accent",
            sa.Enum(
                "slate",
                "gray",
                "zinc",
                "neutral",
                "stone",
                "red",
                "orange",
                "amber",
                "yellow",
                "lime",
                "green",
                "emerald",
                "teal",
                "cyan",
                "sky",
                "blue",
                "indigo",
                "violet",
                "purple",
                "fuchsia",
                "pink",
                "rose",
                name="accent",
            ),
            nullable=False,
        ),
        sa.Column("radius", sa.Enum("none", "small", "medium", "large", name="radius"), nullable=False),
        sa.Column("language", sa.Enum("en", "it", name="language"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("oidc"),
    )

    # Create locations before organizations and infrastructure registries.
    op.create_table(
        "locations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=128), nullable=False),
        sa.Column("country", sa.String(length=2), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "provisioning",
                "ready",
                "failed",
                "deleting",
                name="location_status_enum",
                native_enum=False,
                create_constraint=True,
            ),
            nullable=False,
        ),
        sa.Column("version", sa.String(length=128), nullable=True),
        sa.Column("created_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("created_id", sa.Uuid(), nullable=True),
        sa.Column("updated_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("updated_id", sa.Uuid(), nullable=True),
        sa.Column("deleted_at", longlink.database.types.UTCDateTime(), nullable=True),
        sa.Column("deleted_id", sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(
            ["created_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["deleted_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["updated_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )

    # Create compute registries after their user and location dependencies.
    op.create_table(
        "compute_registries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("kubeconfig", sa.Text(), nullable=False),
        sa.Column("gateway_url", sa.String(length=512), nullable=True),
        sa.Column("proxy_secret", sa.String(length=255), nullable=False),
        sa.Column("gateway_ca_certificate", sa.Text(), nullable=True),
        sa.Column("gateway_previous_ca_certificate", sa.Text(), nullable=True),
        sa.Column("gateway_tls_certificate", sa.Text(), nullable=True),
        sa.Column("gateway_tls_private_key", sa.Text(), nullable=True),
        sa.Column("created_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("created_id", sa.Uuid(), nullable=True),
        sa.Column("updated_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("updated_id", sa.Uuid(), nullable=True),
        sa.Column("deleted_at", longlink.database.types.UTCDateTime(), nullable=True),
        sa.Column("location_id", sa.Uuid(), nullable=False),
        sa.Column("deleted_id", sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(
            ["created_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["deleted_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["locations.id"],
        ),
        sa.ForeignKeyConstraint(
            ["updated_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("location_id", name="uq_compute_registries_location_id"),
        sa.UniqueConstraint("name"),
        sa.UniqueConstraint("slug"),
    )
    # Create database registries after their user and location dependencies.
    op.create_table(
        "database_registries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.Enum("postgresql", name="database_kind_enum", native_enum=False), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("slug", sa.String(length=128), nullable=False),
        sa.Column("created_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("created_id", sa.Uuid(), nullable=True),
        sa.Column("updated_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("updated_id", sa.Uuid(), nullable=True),
        sa.Column("deleted_at", longlink.database.types.UTCDateTime(), nullable=True),
        sa.Column("host", sa.String(length=255), nullable=False),
        sa.Column("port", sa.Integer(), nullable=False),
        sa.Column("password", sa.String(length=255), nullable=False),
        sa.Column("username", sa.String(length=255), nullable=False),
        sa.Column("location_id", sa.Uuid(), nullable=False),
        sa.Column("deleted_id", sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(
            ["created_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["deleted_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["locations.id"],
        ),
        sa.ForeignKeyConstraint(
            ["updated_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("location_id", name="uq_database_registries_location_id"),
        sa.UniqueConstraint("name"),
        sa.UniqueConstraint("slug"),
    )

    # Create organizations after their user and location dependencies.
    op.create_table(
        "organizations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("slug", sa.String(length=128), nullable=False),
        sa.Column("avatar", sa.String(length=2048), nullable=False),
        sa.Column("country", sa.String(length=2), nullable=False),
        sa.Column("location_id", sa.Uuid(), nullable=False),
        sa.Column("shared_schema_url", sa.String(length=2048), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("created_id", sa.Uuid(), nullable=True),
        sa.Column("updated_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("updated_id", sa.Uuid(), nullable=True),
        sa.Column("deleted_at", longlink.database.types.UTCDateTime(), nullable=True),
        sa.Column("deleted_id", sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(
            ["created_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["deleted_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["locations.id"],
        ),
        sa.ForeignKeyConstraint(
            ["updated_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        sa.UniqueConstraint("slug"),
    )

    # Create storage registries after their user and location dependencies.
    op.create_table(
        "storage_registries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.Enum("minio", "exoscale", name="storage_kind_enum", native_enum=False), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("slug", sa.String(length=128), nullable=False),
        sa.Column("endpoint_url", sa.String(length=255), nullable=False),
        sa.Column("access_key_id", sa.String(length=255), nullable=False),
        sa.Column("secret_access_key", sa.String(length=255), nullable=False),
        sa.Column("runtime_endpoint_url", sa.String(length=255), nullable=False),
        sa.Column("created_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("created_id", sa.Uuid(), nullable=True),
        sa.Column("updated_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("updated_id", sa.Uuid(), nullable=True),
        sa.Column("deleted_at", longlink.database.types.UTCDateTime(), nullable=True),
        sa.Column("deleted_id", sa.Uuid(), nullable=True),
        sa.Column("location_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["created_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["deleted_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["locations.id"],
        ),
        sa.ForeignKeyConstraint(
            ["updated_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("location_id", name="uq_storage_registries_location_id"),
        sa.UniqueConstraint("name"),
        sa.UniqueConstraint("slug"),
    )

    # Create applications after organizations.
    op.create_table(
        "applications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("icon", sa.String(length=50), nullable=True),
        sa.Column("image", sa.String(length=512), nullable=False),
        sa.Column("sdk", sa.String(length=128), nullable=True),
        sa.Column("digest", sa.String(length=255), nullable=True),
        sa.Column("version", sa.String(length=128), nullable=True),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("envs", sa.JSON(), nullable=False),
        sa.Column("database_password", sa.String(length=255), nullable=False),
        sa.Column("storage_access_key_id", sa.String(length=255), nullable=True),
        sa.Column("storage_secret_access_key", sa.String(length=255), nullable=True),
        sa.Column(
            "status",
            sa.Enum("creating", "running", "failed", "deleting", name="application_status_enum", native_enum=False),
            nullable=False,
        ),
        sa.Column("created_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("created_id", sa.Uuid(), nullable=True),
        sa.Column("updated_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("updated_id", sa.Uuid(), nullable=True),
        sa.Column("deleted_at", longlink.database.types.UTCDateTime(), nullable=True),
        sa.Column("deleted_id", sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(
            ["created_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["deleted_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
        ),
        sa.ForeignKeyConstraint(
            ["updated_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "id", name="uq_applications_organization_id_id"),
        sa.UniqueConstraint("organization_id", "slug"),
    )

    # Create organization invitations after organizations and users.
    op.create_table(
        "organization_invitations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column(
            "role", sa.Enum("read", "write", "maintain", "admin", "owner", name="organization_role_enum", native_enum=False), nullable=False
        ),
        sa.Column("created_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("created_id", sa.Uuid(), nullable=True),
        sa.Column("updated_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("updated_id", sa.Uuid(), nullable=True),
        sa.Column("deleted_at", longlink.database.types.UTCDateTime(), nullable=True),
        sa.Column("deleted_id", sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(
            ["created_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["deleted_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
        ),
        sa.ForeignKeyConstraint(
            ["updated_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create organization memberships after organizations and users.
    op.create_table(
        "user_organizations",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column(
            "role", sa.Enum("read", "write", "maintain", "admin", "owner", name="organization_role_enum", native_enum=False), nullable=False
        ),
        sa.Column("created_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("created_id", sa.Uuid(), nullable=True),
        sa.Column("updated_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("updated_id", sa.Uuid(), nullable=True),
        sa.Column("deleted_at", longlink.database.types.UTCDateTime(), nullable=True),
        sa.Column("deleted_id", sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(
            ["created_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["deleted_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
        ),
        sa.ForeignKeyConstraint(
            ["updated_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("user_id", "organization_id"),
    )

    # Create one coalesced reconciliation operation per location.
    op.create_table(
        "operations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("location_id", sa.Uuid(), nullable=False),
        sa.Column("error", sa.String(length=2000), nullable=True),
        sa.Column("attempt_count", sa.Integer(), nullable=False),
        sa.Column("platform_version", sa.String(length=128), nullable=False),
        sa.Column("lease_expires_at", longlink.database.types.UTCDateTime(), nullable=True),
        sa.Column("created_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("scheduled_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("started_at", longlink.database.types.UTCDateTime(), nullable=True),
        sa.Column("stopped_at", longlink.database.types.UTCDateTime(), nullable=True),
        sa.ForeignKeyConstraint(["location_id"], ["locations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "uq_operations_open_location_id",
        "operations",
        ["location_id"],
        unique=True,
        postgresql_where=sa.text("stopped_at IS NULL"),
        sqlite_where=sa.text("stopped_at IS NULL"),
    )

    # Create application memberships after applications, organizations, and users.
    op.create_table(
        "user_applications",
        sa.Column("application_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.Enum("read", "write", "maintain", "admin", name="application_role_enum", native_enum=False), nullable=False),
        sa.Column("created_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("created_id", sa.Uuid(), nullable=True),
        sa.Column("updated_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("updated_id", sa.Uuid(), nullable=True),
        sa.Column("deleted_at", longlink.database.types.UTCDateTime(), nullable=True),
        sa.Column("deleted_id", sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(
            ["created_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["deleted_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["organization_id", "application_id"], ["applications.organization_id", "applications.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
        ),
        sa.ForeignKeyConstraint(
            ["updated_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("application_id", "user_id", "organization_id"),
    )


def downgrade() -> None:
    """Drop the initial platform schema."""

    # Drop tables and indexes in reverse dependency order.
    op.drop_table("user_applications")
    op.drop_table("operations")
    op.drop_table("user_organizations")
    op.drop_table("organization_invitations")
    op.drop_table("applications")
    op.drop_table("storage_registries")
    op.drop_table("organizations")
    op.drop_table("database_registries")
    op.drop_table("compute_registries")
    op.drop_table("locations")
    op.drop_table("users")
