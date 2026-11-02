"""Remove unused revision scaling configuration."""

import sqlalchemy as sa
from alembic import op

revision = "20261030_0012"
down_revision = "20261022_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Leave workload scaling configuration in the Kubernetes template."""

    # These snapshot fields never affected deployed workloads.
    with op.batch_alter_table("revisions") as batch:
        batch.drop_constraint("revision_min_scale", type_="check")
        batch.drop_column("min_scale")
        batch.drop_column("idle_seconds")


def downgrade() -> None:
    """Restore unused scaling fields with their original defaults."""

    # Previous values cannot be recovered after the columns are dropped.
    with op.batch_alter_table("revisions") as batch:
        batch.add_column(sa.Column("min_scale", sa.Integer(), server_default="0", nullable=False))
        batch.add_column(sa.Column("idle_seconds", sa.Integer(), server_default="60", nullable=False))
        batch.create_check_constraint("revision_min_scale", "min_scale IN (0, 1)")
