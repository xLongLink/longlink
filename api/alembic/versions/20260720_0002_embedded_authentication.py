# embedded authentication
#
# Revision ID: 20260720_0002
# Revises: 20260713_0001
# Create Date: 2026-07-20 00:00:00.000000
import sqlalchemy as sa
import longlink.database.types
from alembic import op
from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "20260720_0002"
down_revision: str | Sequence[str] | None = "20260713_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Replace provider-only identities with embedded authentication tables."""

    # Add local credential and verification state before removing OIDC subjects.
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("hashed_password", sa.String(length=1024), server_default="", nullable=False))
        batch_op.add_column(sa.Column("is_verified", sa.Boolean(), server_default=sa.false(), nullable=False))
        batch_op.add_column(sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False))
        batch_op.add_column(sa.Column("is_superuser", sa.Boolean(), server_default=sa.false(), nullable=False))
        batch_op.drop_column("oidc")
        batch_op.create_index("ix_users_email", ["email"], unique=True)

    # Store external provider identity separately from the stable local user.
    op.create_table(
        "oauth_accounts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("oauth_name", sa.String(length=100), nullable=False),
        sa.Column("account_id", sa.String(length=320), nullable=False),
        sa.Column("account_email", sa.String(length=320), nullable=False),
        sa.Column("access_token", sa.String(length=1024), nullable=False),
        sa.Column("expires_at", sa.Integer(), nullable=True),
        sa.Column("refresh_token", sa.String(length=1024), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("oauth_name", "account_id", name="uq_oauth_accounts_provider_subject"),
    )
    op.create_index("ix_oauth_accounts_account_id", "oauth_accounts", ["account_id"], unique=False)
    op.create_index("ix_oauth_accounts_oauth_name", "oauth_accounts", ["oauth_name"], unique=False)
    op.create_index("ix_oauth_accounts_user_id", "oauth_accounts", ["user_id"], unique=False)

    # Store revocable browser sessions using FastAPI Users' database strategy.
    op.create_table(
        "access_tokens",
        sa.Column("token", sa.String(length=43), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", longlink.database.types.UTCDateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("token"),
    )
    op.create_index("ix_access_tokens_created_at", "access_tokens", ["created_at"], unique=False)
    op.create_index("ix_access_tokens_user_id", "access_tokens", ["user_id"], unique=False)


def downgrade() -> None:
    """Restore the original provider-only identity schema."""

    # Remove revocable sessions and external identity records first.
    op.drop_index("ix_access_tokens_user_id", table_name="access_tokens")
    op.drop_index("ix_access_tokens_created_at", table_name="access_tokens")
    op.drop_table("access_tokens")
    op.drop_index("ix_oauth_accounts_user_id", table_name="oauth_accounts")
    op.drop_index("ix_oauth_accounts_oauth_name", table_name="oauth_accounts")
    op.drop_index("ix_oauth_accounts_account_id", table_name="oauth_accounts")
    op.drop_table("oauth_accounts")

    # Recreate deterministic OIDC subjects for databases downgraded after this migration.
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_index("ix_users_email")
        batch_op.add_column(sa.Column("oidc", sa.String(length=255), nullable=True))
    op.execute("UPDATE users SET oidc = CAST(id AS VARCHAR)")
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("oidc", nullable=False)
        batch_op.create_unique_constraint("users_oidc_key", ["oidc"])
        batch_op.drop_column("is_superuser")
        batch_op.drop_column("is_active")
        batch_op.drop_column("is_verified")
        batch_op.drop_column("hashed_password")
