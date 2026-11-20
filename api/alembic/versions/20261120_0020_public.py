"""Add opt-in public Solution visibility."""

import sqlalchemy as sa
from alembic import op

revision = "20261120_0020"
down_revision = "20261117_0019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Keep existing Solutions private when introducing public access."""

    op.add_column("solutions", sa.Column("public", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    """Remove public visibility."""

    op.drop_column("solutions", "public")
