import sqlmodel
import sqlalchemy as sa
from alembic import op

revision = "20260630_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Apply the initial purchase request schema."""

    op.create_table(
        "purchase_requests",
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_id", sa.Uuid(), nullable=True),
        sa.Column("updated_id", sa.Uuid(), nullable=True),
        sa.Column("deleted_id", sa.Uuid(), nullable=True),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString(length=32), nullable=False),
        sa.Column("vendor", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column("justification", sqlmodel.sql.sqltypes.AutoString(length=2000), nullable=False),
        sa.ForeignKeyConstraint(["created_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["deleted_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    """Remove the initial purchase request schema."""

    op.drop_table("purchase_requests")
