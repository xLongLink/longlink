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
        sa.Column("gateway_url", sa.String(length=512), nullable=False),
        sa.Column("gateway_certificate", sa.Text(), nullable=True),
        sa.Column("database_size_gib", sa.Integer(), nullable=False),
        sa.Column("database_instances", sa.Integer(), nullable=False),
        sa.Column("database_storage_class", sa.String(length=253), nullable=False),
        sa.Column("storage_class", sa.String(length=253), nullable=False),
        sa.Column("storage_endpoint", sa.String(length=512), nullable=False),
        sa.Column("storage_size_gib", sa.Integer(), nullable=False),
        sa.Column("bucket_size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("bucket_max_objects", sa.Integer(), nullable=False),
        sa.Column("storage_reserve_percent", sa.Integer(), nullable=False),
        sa.Column("storage_object_overhead_bytes", sa.Integer(), nullable=False),
        sa.Column("storage_instances", sa.Integer(), nullable=False),
        sa.Column("storage_certificate", sa.Text(), nullable=True),
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
        sa.Column("database_password", EncryptedType(env.ENCRYPTION_KEY), nullable=False),
        sa.Column("database_idle_seconds", sa.Integer(), nullable=False),
        sa.Column("database_last_active_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column(
            "database_state",
            sa.Enum(
                "available",
                "hibernating",
                "hibernated",
                "resuming",
                "failed",
                name="database_state_enum",
                native_enum=False,
                create_constraint=True,
                validate_strings=True,
            ),
            nullable=False,
        ),
        sa.Column("database_sync_pending", sa.Boolean(), nullable=False),
        sa.Column("database_usage_bytes", sa.BigInteger(), nullable=True),
        sa.Column("database_usage_at", longlink.database.types.UTCDateTime(), nullable=True),
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
        sa.Column("deleted_at", longlink.database.types.UTCDateTime(), nullable=True),
        sa.Column("deleted_id", sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(["compute_id"], ["compute_registries.id"]),
        sa.ForeignKeyConstraint(["created_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["deleted_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_organizations_compute_id", "organizations", ["compute_id"])

    # Track expiring database activity independently of actors and lifecycle operations.
    op.create_table(
        "organization_activities",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("expires_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_organization_activities_organization_id", "organization_activities", ["organization_id"])
    op.create_index("ix_organization_activities_expires_at", "organization_activities", ["expires_at"])

    # Create solutions after organizations.
    op.create_table(
        "solutions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("desired_revision_id", sa.Uuid(), nullable=True),
        sa.Column("deployed_revision_id", sa.Uuid(), nullable=True),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("secrets", EncryptedType(env.ENCRYPTION_KEY), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "creating",
                "failed",
                "running",
                name="solution_status_enum",
                native_enum=False,
                create_constraint=True,
                validate_strings=True,
            ),
            nullable=False,
        ),
        sa.Column("created_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("updated_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("deleted_at", longlink.database.types.UTCDateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "slug"),
    )

    # Release snapshots belong to one stable Solution identity.
    op.create_table(
        "revisions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("solution_id", sa.Uuid(), sa.ForeignKey("solutions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("image", sa.String(512), nullable=False),
        sa.Column("source", sa.String(512), nullable=False),
        sa.Column("min_scale", sa.Integer(), server_default="0", nullable=False),
        sa.CheckConstraint("min_scale IN (0, 1)", name="revision_min_scale"),
        sa.Column("envs", EncryptedType(env.ENCRYPTION_KEY), nullable=False),
        sa.Column("created_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.Column("created_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("failed", sa.Boolean(), nullable=False),
        sa.Column("deployed_at", longlink.database.types.UTCDateTime(), nullable=True),
        sa.UniqueConstraint("solution_id", "id"),
    )
    with op.batch_alter_table("solutions") as batch:
        batch.create_foreign_key("solution_desired_revision", "revisions", ["id", "desired_revision_id"], ["solution_id", "id"])
        batch.create_foreign_key("solution_deployed_revision", "revisions", ["id", "deployed_revision_id"], ["solution_id", "id"])

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
        sa.ForeignKeyConstraint(
            ["created_id"],
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
                "solution.deploy",
                "solution.delete",
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
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_operations_queue",
        "operations",
        ["kind", "target_id", "finished_at", "lease_expires_at"],
    )


def downgrade() -> None:
    """Drop the initial platform schema."""

    # Drop tables and indexes in reverse dependency order.
    op.drop_table("operations")
    op.drop_table("user_organizations")
    op.drop_table("organization_invitations")
    with op.batch_alter_table("solutions") as batch:
        batch.drop_constraint("solution_desired_revision", type_="foreignkey")
        batch.drop_constraint("solution_deployed_revision", type_="foreignkey")
    op.drop_table("revisions")
    op.drop_table("solutions")
    op.drop_table("organization_activities")
    op.drop_table("organizations")
    op.drop_table("compute_registries")
    op.drop_table("users")
