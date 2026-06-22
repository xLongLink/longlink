"""Create the current control-plane schema.

Revision ID: 20260612_initial_schema
Revises:
Create Date: 2026-06-12 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlmodel.sql.sqltypes import AutoString


revision = "20260612_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create the current schema in dependency order."""

    # Core tables come first so foreign keys can resolve cleanly.
    op.create_table(
        "users",
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("created_id", sa.Uuid(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("updated_id", sa.Uuid(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_id", sa.Uuid(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", AutoString(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("avatar", sa.String(length=2048), nullable=True),
        sa.Column("role", sa.Enum("user", "support", "administrator", name="platform_role_enum", native_enum=False), nullable=False),
        sa.Column("theme", sa.Enum("system", "light", "dark", name="theme", native_enum=False), nullable=False),
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
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("radius", sa.Enum("none", "small", "medium", "large", name="radius", native_enum=False), nullable=False),
        sa.Column(
            "language",
            sa.Enum("en", "es", "fr", "de", "it", "pt", "nl", "pl", "tr", "ar", "zh", "ja", "ko", "ru", "hi", name="language", native_enum=False),
            nullable=False,
        ),
        sa.Column("oidc_subject", sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("oidc_subject"),
        sa.ForeignKeyConstraint(["created_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["deleted_id"], ["users.id"]),
    )

    op.create_table(
        "locations",
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("created_id", sa.Uuid(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("updated_id", sa.Uuid(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_id", sa.Uuid(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=128), nullable=False),
        sa.Column("country", sa.String(length=2), nullable=False, server_default=sa.text("'CH'")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
        sa.ForeignKeyConstraint(["created_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["deleted_id"], ["users.id"]),
    )

    # Organization and application tables depend on users and locations.
    op.create_table(
        "organizations",
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("avatar", sa.String(length=2048), nullable=True),
        sa.Column("location_id", sa.Uuid(), nullable=False),
        sa.Column("created_id", sa.Uuid(), nullable=True),
        sa.Column("updated_id", sa.Uuid(), nullable=True),
        sa.Column("deleted_id", sa.Uuid(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        sa.ForeignKeyConstraint(["location_id"], ["locations.id"]),
        sa.ForeignKeyConstraint(["created_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["deleted_id"], ["users.id"]),
    )

    op.create_table(
        "applications",
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("status", sa.Enum("creating", "running", "deleting", "failed", name="app_status_enum", native_enum=False), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("image", sa.String(length=255), nullable=False),
        sa.Column("icon", sa.String(length=50), nullable=True),
        sa.Column("created_id", sa.Uuid(), nullable=True),
        sa.Column("updated_id", sa.Uuid(), nullable=True),
        sa.Column("deleted_id", sa.Uuid(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        sa.UniqueConstraint("organization_id", "name"),
        sa.UniqueConstraint("organization_id", "slug"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["created_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["deleted_id"], ["users.id"]),
    )

    # Registry tables hang off locations and track who created, updated, or deleted them.
    op.create_table(
        "compute_registries",
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("created_id", sa.Uuid(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("updated_id", sa.Uuid(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.Enum("kubernetes", name="compute_kind_enum", native_enum=False), nullable=False),
        sa.Column("kubeconfig", sa.Text(), nullable=False),
        sa.Column("ingress_host", sa.String(length=255), nullable=False),
        sa.Column("ingress_name", sa.String(length=255), nullable=False),
        sa.Column("proxy_secret", sa.String(length=255), nullable=False),
        sa.Column("location_id", sa.Uuid(), nullable=False),
        sa.Column("deleted_id", sa.Uuid(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["location_id"], ["locations.id"]),
        sa.ForeignKeyConstraint(["created_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["deleted_id"], ["users.id"]),
    )

    op.create_table(
        "database_registries",
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("created_id", sa.Uuid(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("updated_id", sa.Uuid(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.Enum("postgre", name="database_kind_enum", native_enum=False), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("host", sa.String(length=255), nullable=False),
        sa.Column("port", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=255), nullable=False),
        sa.Column("password", sa.String(length=255), nullable=False),
        sa.Column("location_id", sa.Uuid(), nullable=False),
        sa.Column("deleted_id", sa.Uuid(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        sa.ForeignKeyConstraint(["location_id"], ["locations.id"]),
        sa.ForeignKeyConstraint(["created_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["deleted_id"], ["users.id"]),
    )

    op.create_table(
        "storage_registries",
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("created_id", sa.Uuid(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("updated_id", sa.Uuid(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.Enum("s3", name="storage_kind_enum", native_enum=False), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("protocol", sa.String(length=16), nullable=False),
        sa.Column("endpoint_url", sa.String(length=255), nullable=False),
        sa.Column("access_key_id", sa.String(length=255), nullable=False),
        sa.Column("secret_access_key", sa.String(length=255), nullable=False),
        sa.Column("location_id", sa.Uuid(), nullable=False),
        sa.Column("deleted_id", sa.Uuid(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
        sa.ForeignKeyConstraint(["location_id"], ["locations.id"]),
        sa.ForeignKeyConstraint(["created_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["deleted_id"], ["users.id"]),
    )

    # Long-running operations are standalone but still reference apps.
    op.create_table(
        "operations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "kind",
            sa.Enum("app.create", "app.delete", name="operation_kind_enum", native_enum=False, create_constraint=True),
            nullable=False,
        ),
        sa.Column("application_id", sa.Uuid(), nullable=True),
        sa.Column("step", sa.String(length=100), nullable=False),
        sa.Column("error", sa.String(length=2000), nullable=True),
        sa.Column("created_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_id", sa.Uuid(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("deleted_id", sa.Uuid(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("stopped_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["application_id"], ["applications.id"]),
        sa.ForeignKeyConstraint(["created_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["deleted_id"], ["users.id"]),
    )

    # Membership tables are last so their parent rows already exist.
    op.create_table(
        "user_organizations",
        sa.Column("created_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_id", sa.Uuid(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("deleted_id", sa.Uuid(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("role_name", sa.Enum("read", "write", "maintain", "admin", "owner", name="role_name_enum", native_enum=False), nullable=False),
        sa.PrimaryKeyConstraint("user_id", "organization_id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["created_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["deleted_id"], ["users.id"]),
    )

    op.create_table(
        "user_applications",
        sa.Column("created_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_id", sa.Uuid(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("deleted_id", sa.Uuid(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("application_id", sa.Uuid(), nullable=False),
        sa.Column("role_name", sa.Enum("read", "write", "maintain", "admin", "owner", name="role_name_enum", native_enum=False), nullable=False),
        sa.PrimaryKeyConstraint("user_id", "organization_id", "application_id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["organization_id", "application_id"], ["applications.organization_id", "applications.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["deleted_id"], ["users.id"]),
    )


def downgrade() -> None:
    """Drop the current schema in reverse dependency order."""

    op.drop_table("user_applications")
    op.drop_table("user_organizations")
    op.drop_table("operations")
    op.drop_table("storage_registries")
    op.drop_table("database_registries")
    op.drop_table("compute_registries")
    op.drop_table("applications")
    op.drop_table("organizations")
    op.drop_table("users")
    op.drop_table("locations")
