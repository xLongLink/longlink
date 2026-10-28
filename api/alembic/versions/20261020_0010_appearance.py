"""Store personal appearance preferences on user accounts."""

import sqlalchemy as sa
from alembic import op

revision = "20261020_0010"
down_revision = "20261020_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Default existing accounts to System mode and a Neutral accent."""

    # Backfill preferences while preserving existing account metadata.
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("theme", sa.String(6), nullable=False, server_default="system"))
        batch.add_column(sa.Column("accent", sa.String(7), nullable=False, server_default="neutral"))


def downgrade() -> None:
    """Remove personal appearance without modifying account identities."""

    # Remove only the appearance fields introduced by this revision.
    with op.batch_alter_table("users") as batch:
        batch.drop_column("accent")
        batch.drop_column("theme")
