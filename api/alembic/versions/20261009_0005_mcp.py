"""Add MCP public clients and hashed authorization credentials."""

import sqlalchemy as sa
from alembic import op
from sqlmodel.sql.sqltypes import UTCDateTime

revision = "20261009_0005"
down_revision = "20261008_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add resource-bound authorization state without changing browser sessions."""

    # Persist immutable client registrations before their referencing credentials.
    op.create_table(
        "mcp_clients",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("redirects", sa.JSON(), nullable=False),
    )

    # Authorization codes are hashed and consumed atomically during PKCE exchange.
    op.create_table(
        "mcp_codes",
        sa.Column("hash", sa.String(64), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("client_id", sa.Uuid(), sa.ForeignKey("mcp_clients.id"), nullable=False),
        sa.Column("solution_id", sa.Uuid(), sa.ForeignKey("solutions.id"), nullable=False),
        sa.Column("resource", sa.String(2048), nullable=False),
        sa.Column("redirect_uri", sa.String(2048), nullable=False),
        sa.Column("challenge", sa.String(43), nullable=False),
        sa.Column("fingerprint", sa.String(64), nullable=False),
        sa.Column("expires_at", UTCDateTime(), nullable=False),
    )
    op.create_index("ix_mcp_codes_expires_at", "mcp_codes", ["expires_at"])

    # Access credentials are independently revocable and never stored in plaintext.
    op.create_table(
        "mcp_tokens",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("hash", sa.String(64), nullable=False, unique=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("client_id", sa.Uuid(), sa.ForeignKey("mcp_clients.id"), nullable=False),
        sa.Column("solution_id", sa.Uuid(), sa.ForeignKey("solutions.id"), nullable=False),
        sa.Column("resource", sa.String(2048), nullable=False),
        sa.Column("fingerprint", sa.String(64), nullable=False),
        sa.Column("expires_at", UTCDateTime(), nullable=False),
    )
    op.create_index("ix_mcp_tokens_user_id", "mcp_tokens", ["user_id"])
    op.create_index("ix_mcp_tokens_expires_at", "mcp_tokens", ["expires_at"])


def downgrade() -> None:
    """Remove MCP authorization credentials without touching browser authentication."""

    # Drop dependent credentials before their client registrations.
    op.drop_table("mcp_tokens")
    op.drop_table("mcp_codes")
    op.drop_table("mcp_clients")
