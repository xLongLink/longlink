"""Store personal navigation layout preferences."""

import sqlalchemy as sa
from alembic import op

revision = "20261031_0013"
down_revision = "20261030_0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Keep existing accounts on the topbar layout."""

    # Backfill the personal layout without changing other appearance preferences.
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("navigation", sa.String(7), nullable=False, server_default="topbar"))


def downgrade() -> None:
    """Remove the personal navigation layout."""

    # Remove only the preference introduced by this revision.
    with op.batch_alter_table("users") as batch:
        batch.drop_column("navigation")
