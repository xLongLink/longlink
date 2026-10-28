import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from alembic import op

revision = "20260713_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create the project schema and seed twelve example building projects."""

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

    # Create the project table without attributing fictional contacts to Platform users.
    op.create_table(
        "project",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("photo", sa.String(length=32), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column("active_step", sa.Integer(), nullable=False),
        sa.Column("owner", sa.String(length=255), nullable=False),
        sa.Column("owner_email", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Seed the demo in every environment once; Alembic prevents restarts from restoring edited data.
    projects = sa.table(
        "project",
        sa.column("name", sa.String()),
        sa.column("photo", sa.String()),
        sa.column("description", sa.String()),
        sa.column("active_step", sa.Integer()),
        sa.column("owner", sa.String()),
        sa.column("owner_email", sa.String()),
    )
    op.bulk_insert(
        projects,
        [
            {
                "name": "Riverside Residences",
                "description": "Modern riverside apartments.",
                "photo": "riverside",
                "active_step": 0,
                "owner": "Anna Keller",
                "owner_email": "anna.keller@example.com",
            },
            {
                "name": "Skyline Tower",
                "description": "A new landmark for the city.",
                "photo": "skyline",
                "active_step": 4,
                "owner": "Marco Rossi",
                "owner_email": "marco.rossi@example.com",
            },
            {
                "name": "Meadow Park Homes",
                "description": "Family homes around a shared neighborhood park.",
                "photo": "garden",
                "active_step": 0,
                "owner": "Sofia Martin",
                "owner_email": "sofia.martin@example.com",
            },
            {
                "name": "Canal Walk Apartments",
                "description": "Canalside apartments with pedestrian courtyards.",
                "photo": "riverside",
                "active_step": 1,
                "owner": "Daniel Weber",
                "owner_email": "daniel.weber@example.com",
            },
            {
                "name": "Central Exchange",
                "description": "Flexible offices beside the central station.",
                "photo": "skyline",
                "active_step": 1,
                "owner": "Marco Rossi",
                "owner_email": "marco.rossi@example.com",
            },
            {
                "name": "Marina Business Center",
                "description": "A waterfront business hub with shared meeting spaces.",
                "photo": "harbor",
                "active_step": 2,
                "owner": "Sofia Martin",
                "owner_email": "sofia.martin@example.com",
            },
            {
                "name": "Oakwood Residences",
                "description": "Low-rise apartments overlooking landscaped gardens.",
                "photo": "garden",
                "active_step": 3,
                "owner": "Anna Keller",
                "owner_email": "anna.keller@example.com",
            },
            {
                "name": "Riverbank Lofts",
                "description": "Open-plan homes along the riverside promenade.",
                "photo": "riverside",
                "active_step": 3,
                "owner": "Daniel Weber",
                "owner_email": "daniel.weber@example.com",
            },
            {
                "name": "Summit Plaza",
                "description": "A mixed-use tower with street-level retail.",
                "photo": "skyline",
                "active_step": 4,
                "owner": "Sofia Martin",
                "owner_email": "sofia.martin@example.com",
            },
            {
                "name": "Dockside Studios",
                "description": "Creative workspaces in the harbor district.",
                "photo": "harbor",
                "active_step": 5,
                "owner": "Marco Rossi",
                "owner_email": "marco.rossi@example.com",
            },
            {
                "name": "Garden Apartments",
                "description": "Light-filled homes with green spaces.",
                "photo": "garden",
                "active_step": 5,
                "owner": "Anna Keller",
                "owner_email": "anna.keller@example.com",
            },
            {
                "name": "Harbor Offices",
                "description": "Contemporary waterfront workspaces.",
                "photo": "harbor",
                "active_step": 2,
                "owner": "Marco Rossi",
                "owner_email": "marco.rossi@example.com",
            },
        ],
    )


def downgrade() -> None:
    """Remove the Solution schema."""

    # Drop dependent tables before users.
    op.drop_table("project")
    op.drop_table("users")
