"""Remove unused database replica configuration without discarding nondefault values."""

import sqlalchemy as sa
from alembic import op

revision = "20261108_0017"
down_revision = "20261108_0016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Remove replica configuration only for single-instance Organizations."""

    # Refuse to discard configurations that require an explicit topology migration.
    organizations = sa.table("organizations", sa.column("database_instances", sa.Integer()))
    nondefault = op.get_bind().scalar(sa.select(organizations.c.database_instances).where(organizations.c.database_instances != 1).limit(1))
    if nondefault is not None:
        raise RuntimeError("Cannot remove database_instances while nondefault values exist; migrate multi-instance databases first")

    # Keep Organization identities and storage capacity unchanged.
    with op.batch_alter_table("organizations") as batch:
        batch.drop_column("database_instances")


def downgrade() -> None:
    """Restore replica configuration with the supported single-instance default."""

    # All databases admitted by the upgrade use one instance.
    with op.batch_alter_table("organizations") as batch:
        batch.add_column(sa.Column("database_instances", sa.Integer(), nullable=False, server_default="1"))
