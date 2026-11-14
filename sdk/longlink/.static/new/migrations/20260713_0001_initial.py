import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from alembic import op

revision = "20260713_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create users and tasks."""

    # Preserve profiles in databases previously bootstrapped by the SDK.
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column(
            "email", sqlmodel.sql.sqltypes.AutoString(length=254), nullable=False
        ),
        sa.Column(
            "avatar", sqlmodel.sql.sqltypes.AutoString(length=2048), nullable=False
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        if_not_exists=True,
    )

    # Persist tasks with attribution to request users.
    op.create_table(
        "task",
        sa.Column("created_at", sqlmodel.sql.sqltypes.UTCDateTime(), nullable=False),
        sa.Column("updated_at", sqlmodel.sql.sqltypes.UTCDateTime(), nullable=False),
        sa.Column("created_id", sa.Uuid(), nullable=False),
        sa.Column("updated_id", sa.Uuid(), nullable=False),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column(
            "title", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False
        ),
        sa.Column(
            "attachment", sqlmodel.sql.sqltypes.AutoString(length=256), nullable=True
        ),
        sa.ForeignKeyConstraint(["created_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    """Remove the Solution schema."""

    # Drop dependent tables before users.
    op.drop_table("task")
    op.drop_table("users")
