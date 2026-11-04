import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from alembic import op

revision = "20261104_0002"
down_revision = "20260713_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create tasks and remove fictional project contacts."""

    # Persist tasks with attribution to request users.
    op.create_table(
        "task",
        sa.Column("created_at", sqlmodel.sql.sqltypes.UTCDateTime(), nullable=False),
        sa.Column("updated_at", sqlmodel.sql.sqltypes.UTCDateTime(), nullable=False),
        sa.Column("created_id", sa.Uuid(), nullable=False),
        sa.Column("updated_id", sa.Uuid(), nullable=False),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column("description", sqlmodel.sql.sqltypes.AutoString(length=5000), nullable=False),
        sa.ForeignKeyConstraint(["created_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # Preserve projects while removing their illustrative owner fields.
    op.drop_column("project", "owner_email")
    op.drop_column("project", "owner")


def downgrade() -> None:
    """Restore empty project contacts and remove tasks."""

    # Removed contacts cannot be recovered, so restore empty owner fields.
    op.add_column("project", sa.Column("owner", sa.String(length=255), nullable=False, server_default=""))
    op.add_column("project", sa.Column("owner_email", sa.String(length=255), nullable=False, server_default=""))

    # Remove tasks before reverting their schema revision.
    op.drop_table("task")
