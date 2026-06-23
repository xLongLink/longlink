"""Add immutable organization slugs.

Revision ID: 20260623_organization_slug
Revises: 20260622_avatar_not_null
Create Date: 2026-06-23 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "20260623_organization_slug"
down_revision = "20260622_avatar_not_null"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Backfill slugs from organization names and enforce immutability."""

    op.add_column("organizations", sa.Column("slug", sa.String(length=128), nullable=True))
    op.execute("UPDATE organizations SET slug = lower(replace(name, ' ', '-')) WHERE slug IS NULL")

    # SQLite needs batch mode to rebuild the table when tightening constraints.
    with op.batch_alter_table("organizations") as batch_op:
        batch_op.alter_column("slug", existing_type=sa.String(length=128), nullable=False)
        batch_op.create_unique_constraint("uq_organizations_slug", ["slug"])


def downgrade() -> None:
    """Drop the slug column and constraint."""

    with op.batch_alter_table("organizations") as batch_op:
        batch_op.drop_constraint("uq_organizations_slug", type_="unique")
        batch_op.drop_column("slug")
