# initial
#
# Revision ID: 20260713_0001
# Revises:
# Create Date: 2026-07-13 16:22:13.474968
import sqlalchemy as sa
import longlink.database.types
from alembic import op
from collections.abc import Sequence
from src.environments import env
from src.database.types import EncryptedType

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
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("avatar", sa.String(length=2048), nullable=False),
        sa.Column("password", sa.String(length=128), nullable=False),
        sa.Column("google_id", sa.String(length=255), nullable=True),
        sa.Column("github_id", sa.String(length=255), nullable=True),
        sa.Column("created_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("updated_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("deleted_at", longlink.database.types.UTCDateTime(), nullable=True),
        sa.Column("administrator", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_google_id", "users", ["google_id"], unique=True)
    op.create_index("ix_users_github_id", "users", ["github_id"], unique=True)

    # Create compute registries.
    op.create_table(
        "compute_registries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("kubeconfig", EncryptedType(env.ENCRYPTION_KEY), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "creating",
                "failed",
                "running",
                name="compute_status_enum",
                native_enum=False,
                create_constraint=True,
                validate_strings=True,
            ),
            nullable=False,
        ),
        sa.Column("gateway_url", sa.String(length=512), nullable=True),
        sa.Column("gateway_certificate", sa.Text(), nullable=True),
        sa.Column("gateway_client_identity", EncryptedType(env.ENCRYPTION_KEY), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    # Create database registries.
    op.create_table(
        "database_registries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("host", sa.String(length=255), nullable=False),
        sa.Column("port", sa.Integer(), nullable=False),
        sa.Column("password", EncryptedType(env.ENCRYPTION_KEY), nullable=False),
        sa.Column(
            "sslmode",
            sa.Enum("disable", "require", name="databasesslmode", native_enum=False),
            nullable=False,
        ),
        sa.Column("username", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    # Create storage registries.
    op.create_table(
        "storage_registries",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("endpoint_url", sa.String(length=255), nullable=False),
        sa.Column("access_key_id", EncryptedType(env.ENCRYPTION_KEY), nullable=False),
        sa.Column("secret_access_key", EncryptedType(env.ENCRYPTION_KEY), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    # Create organizations after their user and infrastructure dependencies.
    op.create_table(
        "organizations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("slug", sa.String(length=128), nullable=False),
        sa.Column("avatar", sa.String(length=2048), nullable=False),
        sa.Column("compute_id", sa.Uuid(), nullable=False),
        sa.Column("database_id", sa.Uuid(), nullable=False),
        sa.Column("storage_id", sa.Uuid(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "creating",
                "failed",
                "running",
                name="organization_status_enum",
                native_enum=False,
                create_constraint=True,
                validate_strings=True,
            ),
            nullable=False,
        ),
        sa.Column("created_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("created_id", sa.Uuid(), nullable=True),
        sa.Column("updated_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("updated_id", sa.Uuid(), nullable=True),
        sa.Column("deleted_at", longlink.database.types.UTCDateTime(), nullable=True),
        sa.Column("deleted_id", sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(["compute_id"], ["compute_registries.id"]),
        sa.ForeignKeyConstraint(["created_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["database_id"], ["database_registries.id"]),
        sa.ForeignKeyConstraint(["deleted_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["storage_id"], ["storage_registries.id"]),
        sa.ForeignKeyConstraint(["updated_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_organizations_compute_id", "organizations", ["compute_id"])
    op.create_index("ix_organizations_database_id", "organizations", ["database_id"])
    op.create_index("ix_organizations_storage_id", "organizations", ["storage_id"])

    # Create applications after organizations.
    op.create_table(
        "applications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("image_desired", sa.String(length=512), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("secrets", EncryptedType(env.ENCRYPTION_KEY), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "creating",
                "failed",
                "running",
                name="application_status_enum",
                native_enum=False,
                create_constraint=True,
                validate_strings=True,
            ),
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
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["updated_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
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
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "email"),
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
            ondelete="CASCADE",
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

    # Create durable typed operations with expiring worker locks.
    op.create_table(
        "operations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "kind",
            sa.Enum(
                "compute.create",
                "application.create",
                "application.delete",
                "organization.create",
                "organization.delete",
                name="operation_kind_enum",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("target_id", sa.Uuid(), nullable=False),
        sa.Column("failed", sa.String(length=500), nullable=True),
        sa.Column("logs", sa.JSON(), nullable=False),
        sa.Column("lease_expires_at", longlink.database.types.UTCDateTime(), nullable=True),
        sa.Column("created_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("finished_at", longlink.database.types.UTCDateTime(), nullable=True),
        sa.Column(
            "unleased_target_id",
            sa.Uuid(),
            sa.Computed("CASE WHEN finished_at IS NULL AND lease_expires_at IS NULL THEN target_id ELSE NULL END"),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_operations_queue",
        "operations",
        ["kind", "target_id", "finished_at", "lease_expires_at"],
    )
    op.create_index(
        "uq_operations_unleased_target",
        "operations",
        ["kind", "unleased_target_id"],
        unique=True,
    )


def downgrade() -> None:
    """Drop the initial platform schema."""

    # Drop tables and indexes in reverse dependency order.
    op.drop_table("operations")
    op.drop_table("user_organizations")
    op.drop_table("organization_invitations")
    op.drop_table("applications")
    op.drop_table("organizations")
    op.drop_table("storage_registries")
    op.drop_table("database_registries")
    op.drop_table("compute_registries")
    op.drop_table("users")
