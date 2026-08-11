import sqlalchemy as sa
from alembic import op

revision = "20260713_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Apply the initial item schema."""

    # Create the Application-owned item table.
    op.create_table(
        "item",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("price", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    """Remove the initial item schema."""

    # Remove the Application-owned item table.
    op.drop_table("item")
