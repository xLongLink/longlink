"""Create the current control-plane schema.

Revision ID: 20260604_initial_schema
Revises: 
Create Date: 2026-06-04 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlmodel.sql.sqltypes import AutoString


revision = "20260604_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create all current tables in dependency order."""

    # Core lookup and identity tables come first so dependent foreign keys can resolve.
    op.create_table(
        "locations",
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column("country", sa.String(length=128), nullable=False, server_default=""),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "users",
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", AutoString(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("avatar", sa.String(length=2048), nullable=True),
        sa.Column("admin", sa.Boolean(), nullable=False),
        sa.Column("theme", sa.Enum("system", "light", "dark", name="theme", native_enum=False), nullable=False),
        sa.Column("accent", sa.Enum(
            "slate", "gray", "zinc", "neutral", "stone", "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose",
            name="accent",
            native_enum=False,
        ), nullable=False),
        sa.Column("radius", sa.Enum("none", "small", "medium", "large", name="radius", native_enum=False), nullable=False),
        sa.Column("language", sa.Enum("en", "es", "fr", "de", "it", "pt", "nl", "pl", "tr", "ar", "zh", "ja", "ko", "ru", "hi", name="language", native_enum=False), nullable=False),
        sa.Column("oidc_subject", sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("oidc_subject"),
    )

    # Organizational and application tables depend on the core identity tables above.
    op.create_table(
        "organizations",
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("updated_by_id", sa.Integer(), nullable=True),
        sa.Column("deleted_by_id", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("name"),
        sa.ForeignKeyConstraint(["location_id"], ["locations.id"]),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["deleted_by_id"], ["users.id"]),
    )

    op.create_table(
        "apps",
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("organization", sa.String(length=100), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("image", sa.String(length=255), nullable=False),
        sa.Column("icon", sa.String(length=50), nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("updated_by_id", sa.Integer(), nullable=True),
        sa.Column("deleted_by_id", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["organization"], ["organizations.name"]),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["deleted_by_id"], ["users.id"]),
        sa.UniqueConstraint("organization", "name"),
        sa.UniqueConstraint("organization", "slug"),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "compute_registries",
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.Enum("kubernetes", name="compute_kind_enum", native_enum=False), nullable=False),
        sa.Column("kubeconfig", sa.Text(), nullable=False),
        sa.Column("ingress_host", sa.String(length=255), nullable=False),
        sa.Column("ingress_name", sa.String(length=255), nullable=False),
        sa.Column("proxy_secret", sa.String(length=255), nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["location_id"], ["locations.id"]),
    )

    op.create_table(
        "database_registries",
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.Enum("postgre", name="database_kind_enum", native_enum=False), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("host", sa.String(length=255), nullable=False),
        sa.Column("port", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=255), nullable=False),
        sa.Column("password", sa.String(length=255), nullable=False),
        sa.Column("sslmode", sa.String(length=32), nullable=True),
        sa.Column("maintenance_database", sa.String(length=255), nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["location_id"], ["locations.id"]),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "storage_registries",
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.Enum("s3", name="storage_kind_enum", native_enum=False), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("protocol", sa.String(length=16), nullable=False),
        sa.Column("endpoint_url", sa.String(length=255), nullable=False),
        sa.Column("access_key_id", sa.String(length=255), nullable=False),
        sa.Column("secret_access_key", sa.String(length=255), nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["location_id"], ["locations.id"]),
        sa.UniqueConstraint("name"),
    )

    # Association tables are created last so both sides of each relationship already exist.
    op.create_table(
        "user_organizations",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("organization_name", sa.String(length=128), nullable=False),
        sa.Column("role_name", sa.Enum("read", "write", "maintain", "admin", "owner", name="role_name_enum", native_enum=False), nullable=False),
        sa.PrimaryKeyConstraint("user_id", "organization_name"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_name"], ["organizations.name"]),
    )

    op.create_table(
        "user_apps",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("organization_name", sa.String(length=128), nullable=False),
        sa.Column("app_name", sa.String(length=100), nullable=False),
        sa.Column("role_name", sa.Enum("read", "write", "maintain", "admin", "owner", name="role_name_enum", native_enum=False), nullable=False),
        sa.PrimaryKeyConstraint("user_id", "organization_name", "app_name"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_name"], ["organizations.name"]),
        sa.ForeignKeyConstraint(["organization_name", "app_name"], ["apps.organization", "apps.name"], ondelete="CASCADE"),
    )


def downgrade() -> None:
    """Drop all current tables in reverse dependency order."""

    op.drop_table("user_apps")
    op.drop_table("user_organizations")
    op.drop_table("storage_registries")
    op.drop_table("database_registries")
    op.drop_table("compute_registries")
    op.drop_table("apps")
    op.drop_table("organizations")
    op.drop_table("users")
    op.drop_table("locations")
