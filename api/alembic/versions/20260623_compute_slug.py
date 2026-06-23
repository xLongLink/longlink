"""Add immutable compute slugs.

Revision ID: 20260623_compute_slug
Revises: 20260623_organization_slug
Create Date: 2026-06-23 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

from src.utils.utils import slugify

revision = "20260623_compute_slug"
down_revision = "20260623_organization_slug"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Backfill compute slugs from ingress hosts and enforce uniqueness."""

    op.add_column("compute_registries", sa.Column("slug", sa.String(length=255), nullable=True))

    connection = op.get_bind()
    rows = connection.execute(sa.text("SELECT id, ingress_host FROM compute_registries")).all()
    for registry_id, ingress_host in rows:
        connection.execute(
            sa.text("UPDATE compute_registries SET slug = :slug WHERE id = :id"),
            {"slug": slugify(ingress_host), "id": registry_id},
        )

    # SQLite needs batch mode to rebuild the table when tightening constraints.
    with op.batch_alter_table("compute_registries") as batch_op:
        batch_op.alter_column("slug", existing_type=sa.String(length=255), nullable=False)
        batch_op.create_unique_constraint("uq_compute_registries_slug", ["slug"])


def downgrade() -> None:
    """Drop the compute slug column and its uniqueness constraint."""

    with op.batch_alter_table("compute_registries") as batch_op:
        batch_op.drop_constraint("uq_compute_registries_slug", type_="unique")
        batch_op.drop_column("slug")
