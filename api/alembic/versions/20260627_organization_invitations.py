import sqlalchemy as sa
from alembic import op


revision = "20260627_organization_invitations"
down_revision = "20260624_location_provider"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create the invitations table."""

    op.create_table(
        "organization_invitations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("role_name", sa.Enum("read", "write", "maintain", "admin", "owner", name="organization_role_enum", native_enum=False), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("created_id", sa.Uuid(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("updated_id", sa.Uuid(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("deleted_id", sa.Uuid(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "email"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["created_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["deleted_id"], ["users.id"]),
    )


def downgrade() -> None:
    """Drop the invitations table."""

    op.drop_table("organization_invitations")
