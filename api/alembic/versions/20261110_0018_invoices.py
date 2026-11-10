"""Remove the unused invoice measurement timestamp."""

import sqlalchemy as sa
from alembic import op
from sqlmodel.sql.sqltypes import UTCDateTime

revision = "20261110_0018"
down_revision = "20261108_0017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Drop measurement timestamps without changing retained billing snapshots."""

    # Preserve invoice identities, usage, and Stripe accounting references.
    with op.batch_alter_table("invoices") as batch:
        batch.drop_column("measured_at")


def downgrade() -> None:
    """Restore the column with rollback timestamps; original measurements cannot be recovered."""

    # Backfill retained invoices before restoring the original client-owned default policy.
    with op.batch_alter_table("invoices") as batch:
        batch.add_column(sa.Column("measured_at", UTCDateTime(), nullable=False, server_default=sa.func.current_timestamp()))

    with op.batch_alter_table("invoices") as batch:
        batch.alter_column("measured_at", server_default=None)
