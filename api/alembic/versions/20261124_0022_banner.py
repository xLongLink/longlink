import sqlalchemy as sa
from alembic import op

revision = "20261124_0022"
down_revision = "20261120_0021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Retain optional hosted banners on release snapshots."""

    with op.batch_alter_table("revisions") as batch:
        batch.add_column(sa.Column("banner", sa.String(length=2048), nullable=True))


def downgrade() -> None:
    """Remove banner metadata without removing release snapshots."""

    with op.batch_alter_table("revisions") as batch:
        batch.drop_column("banner")
