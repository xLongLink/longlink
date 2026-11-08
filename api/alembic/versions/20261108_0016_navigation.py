"""Remove the navigation preference now that all accounts use the sidebar."""

import sqlalchemy as sa
from alembic import op

revision = "20261108_0016"
down_revision = "20261102_0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Remove the obsolete personal layout preference."""

    # Leave all other account preferences unchanged.
    with op.batch_alter_table("users") as batch:
        batch.drop_column("navigation")


def downgrade() -> None:
    """Restore the preference with the sidebar as the default."""

    # Accounts retain the sidebar layout when rolling back.
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("navigation", sa.String(7), nullable=False, server_default="sidebar"))
