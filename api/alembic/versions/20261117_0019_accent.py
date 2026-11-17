"""Remove the user accent color preference."""

import sqlalchemy as sa
from alembic import op

revision = "20261117_0019"
down_revision = "20261110_0018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Drop the accent color preference."""
    with op.batch_alter_table("users") as batch:
        batch.drop_column("accent")


def downgrade() -> None:
    """Restore the neutral accent color default."""
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("accent", sa.String(7), nullable=False, server_default="neutral"))

    with op.batch_alter_table("users") as batch:
        batch.alter_column("accent", server_default=None)
