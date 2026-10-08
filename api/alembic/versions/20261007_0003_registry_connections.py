"""Add organization-owned registry connections and immutable release references."""

import sqlalchemy as sa
from alembic import op
from src.environments import env
from src.database.types import EncryptedType

revision = "20261007_0003"
down_revision = "20260923_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create encrypted registry connections and nullable existing-release references."""

    # Keep existing public deployments unchanged.
    op.create_table(
        "registry_connections",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("organization_id", sa.Uuid(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "provider",
            sa.Enum("ghcr", name="registry_provider_enum", native_enum=False, create_constraint=True, validate_strings=True, length=50),
            nullable=False,
        ),
        sa.Column("username", sa.String(100), nullable=False),
        sa.Column("credential", EncryptedType(env.ENCRYPTION_KEY), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.Column("created_id", sa.Uuid(), sa.ForeignKey("users.id")),
        sa.Column("updated_id", sa.Uuid(), sa.ForeignKey("users.id")),
        sa.Column("deleted_id", sa.Uuid(), sa.ForeignKey("users.id")),
    )
    with op.batch_alter_table("revisions") as batch:
        batch.add_column(sa.Column("registry_connection_id", sa.Uuid(), nullable=True))
        batch.create_foreign_key("revision_registry_connection", "registry_connections", ["registry_connection_id"], ["id"])


def downgrade() -> None:
    """Remove registry references before dropping their encrypted connection records."""

    # Restore the public-only release schema.
    with op.batch_alter_table("revisions") as batch:
        batch.drop_constraint("revision_registry_connection", type_="foreignkey")
        batch.drop_column("registry_connection_id")
    op.drop_table("registry_connections")
