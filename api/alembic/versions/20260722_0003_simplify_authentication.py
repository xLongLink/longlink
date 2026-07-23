"""remove pending user authentication state

Revision ID: 20260722_0003
Revises: 20260722_0002
Create Date: 2026-07-22 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op
from collections.abc import Sequence
from longlink.database.types import UTCDateTime

# revision identifiers, used by Alembic.
revision: str = "20260722_0003"
down_revision: str | Sequence[str] | None = "20260722_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Remove fields made redundant by authenticated account creation."""

    connection = op.get_bind()

    # Pending legacy registrations never completed authentication and must not become accounts.
    connection.execute(sa.text("DELETE FROM users WHERE is_verified = false"))

    # Preserve account suspensions through the remaining soft-deletion authentication boundary.
    connection.execute(sa.text("UPDATE users SET deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP) WHERE is_active = false"))

    # Persisted users have completed authentication, so pending state is no longer stored.
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("verification_code_expires_at")
        batch_op.drop_column("verification_code_hash")
        batch_op.drop_column("is_verified")
        batch_op.drop_column("is_active")


def downgrade() -> None:
    """Restore legacy activation and verification fields."""

    # Existing persisted users must remain active and verified after downgrade.
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))
        batch_op.add_column(sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.true()))
        batch_op.add_column(sa.Column("verification_code_hash", sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column("verification_code_expires_at", UTCDateTime(), nullable=True))

    # Restore legacy state from the persisted account invariant, then remove temporary defaults.
    connection = op.get_bind()
    connection.execute(sa.text("UPDATE users SET is_active = deleted_at IS NULL, is_verified = true"))
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("is_active", server_default=None)
        batch_op.alter_column("is_verified", server_default=None)
