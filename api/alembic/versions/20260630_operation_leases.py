import sqlalchemy as sa
from alembic import op


revision = "20260630_operation_leases"
down_revision = "20260629_application_runtime_registries"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add leases so operation workers can safely scale horizontally."""

    op.add_column("operations", sa.Column("lease_token", sa.String(length=100), nullable=True))
    op.add_column("operations", sa.Column("lease_expires_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Remove operation lease fields."""

    op.drop_column("operations", "lease_expires_at")
    op.drop_column("operations", "lease_token")
