import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from alembic import op

revision = "20260713_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create users, tasks, and twelve example building projects."""

    # Preserve profiles in databases previously bootstrapped by the SDK.
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column("email", sqlmodel.sql.sqltypes.AutoString(length=254), nullable=False),
        sa.Column("avatar", sqlmodel.sql.sqltypes.AutoString(length=2048), nullable=False),
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
        sa.Column("title", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column("attachment", sqlmodel.sql.sqltypes.AutoString(length=256), nullable=True),
        sa.ForeignKeyConstraint(["created_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create the project table without fictional owner contacts.
    op.create_table(
        "project",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("photo", sa.String(length=32), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column("active_step", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Seed the demo in every environment once; Alembic prevents restarts from restoring edited data.
    projects = sa.table(
        "project",
        sa.column("name", sa.String()),
        sa.column("photo", sa.String()),
        sa.column("description", sa.String()),
        sa.column("active_step", sa.Integer()),
    )
    op.bulk_insert(
        projects,
        [
            {
                "name": "Riverside Residences",
                "description": "Modern riverside apartments.",
                "photo": "riverside",
                "active_step": 0,
            },
            {
                "name": "Skyline Tower",
                "description": "A new landmark for the city.",
                "photo": "skyline",
                "active_step": 4,
            },
            {
                "name": "Meadow Park Homes",
                "description": "Family homes around a shared neighborhood park.",
                "photo": "garden",
                "active_step": 0,
            },
            {
                "name": "Canal Walk Apartments",
                "description": "Canalside apartments with pedestrian courtyards.",
                "photo": "riverside",
                "active_step": 1,
            },
            {
                "name": "Central Exchange",
                "description": "Flexible offices beside the central station.",
                "photo": "skyline",
                "active_step": 1,
            },
            {
                "name": "Marina Business Center",
                "description": "A waterfront business hub with shared meeting spaces.",
                "photo": "harbor",
                "active_step": 2,
            },
            {
                "name": "Oakwood Residences",
                "description": "Low-rise apartments overlooking landscaped gardens.",
                "photo": "garden",
                "active_step": 3,
            },
            {
                "name": "Riverbank Lofts",
                "description": "Open-plan homes along the riverside promenade.",
                "photo": "riverside",
                "active_step": 3,
            },
            {
                "name": "Summit Plaza",
                "description": "A mixed-use tower with street-level retail.",
                "photo": "skyline",
                "active_step": 4,
            },
            {
                "name": "Dockside Studios",
                "description": "Creative workspaces in the harbor district.",
                "photo": "harbor",
                "active_step": 5,
            },
            {
                "name": "Garden Apartments",
                "description": "Light-filled homes with green spaces.",
                "photo": "garden",
                "active_step": 5,
            },
            {
                "name": "Harbor Offices",
                "description": "Contemporary waterfront workspaces.",
                "photo": "harbor",
                "active_step": 2,
            },
        ],
    )


def downgrade() -> None:
    """Remove the Solution schema."""

    # Drop dependent tables before users.
    op.drop_table("project")
    op.drop_table("task")
    op.drop_table("users")
