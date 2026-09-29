import sqlalchemy as sa
from alembic import op
from collections.abc import Sequence

revision: str = "20260929_0002"
down_revision: str | Sequence[str] | None = "20260713_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Limit shared user rows to the profile fields used by Solutions."""

    # Keep the audit table name so existing Solution foreign keys remain valid.
    op.drop_column("audit", "role")
    op.drop_column("audit", "created_at")
    op.drop_column("audit", "updated_at")
    op.drop_column("audit", "deleted_at")


def downgrade() -> None:
    """Restore the legacy projection columns with defaults for existing users."""

    # Existing profiles no longer carry role or audit timestamps.
    op.add_column("audit", sa.Column("role", sa.String(length=32), nullable=False, server_default="read"))
    op.add_column("audit", sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()))
    op.add_column("audit", sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()))
    op.add_column("audit", sa.Column("deleted_at", sa.TIMESTAMP(timezone=True), nullable=True))
    op.alter_column("audit", "role", server_default=None)
    op.alter_column("audit", "created_at", server_default=None)
    op.alter_column("audit", "updated_at", server_default=None)
