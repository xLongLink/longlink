import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from alembic import op

revision = "20260713_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Apply the initial item schema."""

    # Create the Solution-owned item table.
    op.create_table(
        "item",
        sa.Column("created_at", sqlmodel.sql.sqltypes.UTCDateTime(), nullable=True),
        sa.Column("updated_at", sqlmodel.sql.sqltypes.UTCDateTime(), nullable=True),
        sa.Column("deleted_at", sqlmodel.sql.sqltypes.UTCDateTime(), nullable=True),
        sa.Column("created_id", sa.Uuid(), nullable=True),
        sa.Column("updated_id", sa.Uuid(), nullable=True),
        sa.Column("deleted_id", sa.Uuid(), nullable=True),
        sa.Column("approved_by_id", sa.Uuid(), nullable=True),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "draft", "pending", "approved", name="invoice_status", native_enum=False
            ),
            server_default="draft",
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["created_id"], ["audit.id"]),
        sa.ForeignKeyConstraint(["updated_id"], ["audit.id"]),
        sa.ForeignKeyConstraint(["deleted_id"], ["audit.id"]),
        sa.ForeignKeyConstraint(
            ["approved_by_id"], ["audit.id"], name="item_approved_by_id_fkey"
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    """Remove the initial item schema."""

    # Remove the Solution-owned item table.
    op.drop_table("item")
