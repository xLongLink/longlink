"""Add shared Organization categories and same-Organization Solution assignments."""

import sqlalchemy as sa
from uuid import uuid4
from alembic import op

revision = "20261020_0009"
down_revision = "20261017_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Keep categories separate from runtime and deployment metadata."""

    # Composite references enforce tenant boundaries for every assignment.
    with op.batch_alter_table("solutions") as batch:
        batch.create_unique_constraint("uq_solutions_organization_id", ["organization_id", "id"])

    op.create_table(
        "organization_tags",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("organization_id", sa.Uuid(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "icon",
            sa.Enum(
                "tag",
                "book-open",
                "users",
                "folder",
                "layers",
                "wrench",
                "calendar",
                "building-2",
                "chart-no-axes-combined",
                "app-window",
                "briefcase-business",
                "clipboard-list",
                name="tag_icon_enum",
                native_enum=False,
                create_constraint=True,
            ),
            nullable=False,
            server_default="tag",
        ),
        sa.Column(
            "kind",
            sa.Enum("all", "tag", name="tag_kind_enum", native_enum=False, create_constraint=True),
            nullable=False,
            server_default="tag",
        ),
        sa.UniqueConstraint("organization_id", "name"),
        sa.UniqueConstraint("organization_id", "id"),
    )
    op.create_index("ix_organization_tags_organization_id", "organization_tags", ["organization_id"])

    # Seed the editable All tab once for existing Organizations.
    organizations = sa.table("organizations", sa.column("id", sa.Uuid()))
    tags = sa.table(
        "organization_tags",
        sa.column("id", sa.Uuid()),
        sa.column("organization_id", sa.Uuid()),
        sa.column("name", sa.String(64)),
        sa.column("icon", sa.String(32)),
        sa.column("kind", sa.String(3)),
    )
    organization_ids = op.get_bind().execute(sa.select(organizations.c.id)).scalars().all()
    if organization_ids:
        op.bulk_insert(
            tags,
            [
                {"id": uuid4(), "organization_id": organization_id, "name": "All", "kind": "all", "icon": "app-window"}
                for organization_id in organization_ids
            ],
        )

    # Category assignments remain constrained to the Solution's Organization.
    op.create_table(
        "solution_tags",
        sa.Column("tag_id", sa.Uuid(), primary_key=True),
        sa.Column("solution_id", sa.Uuid(), primary_key=True),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Index("ix_solution_tags_organization_solution", "organization_id", "solution_id"),
        sa.Index("ix_solution_tags_organization_tag", "organization_id", "tag_id"),
        sa.ForeignKeyConstraint(["organization_id", "solution_id"], ["solutions.organization_id", "solutions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["organization_id", "tag_id"], ["organization_tags.organization_id", "organization_tags.id"], ondelete="CASCADE"
        ),
    )


def downgrade() -> None:
    """Remove categorization without modifying Solutions."""

    # Drop dependent assignments before their category and Solution constraints.
    op.drop_table("solution_tags")
    op.drop_table("organization_tags")
    with op.batch_alter_table("solutions") as batch:
        batch.drop_constraint("uq_solutions_organization_id", type_="unique")
