"""Calculate invoice charges at issuance instead of storing pricing snapshots."""

from alembic import op

revision = "20261022_0011"
down_revision = "20261020_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Keep measured usage and Stripe references without stored charge amounts."""

    # Invoice totals remain authoritative in Stripe.
    with op.batch_alter_table("invoices") as batch:
        batch.drop_column("user_amount")
        batch.drop_column("storage_amount")
        batch.drop_column("database_amount")


def downgrade() -> None:
    """Require a backup to recover discarded pricing snapshots."""

    raise NotImplementedError("Removed invoice pricing cannot be reconstructed; restore a database backup to downgrade")
