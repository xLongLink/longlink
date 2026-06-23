"""Add immutable database and storage slugs.

Revision ID: 20260623_database_storage_slug
Revises: 20260623_compute_slug
Create Date: 2026-06-23 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

from src.utils.utils import slugify

revision = "20260623_database_storage_slug"
down_revision = "20260623_compute_slug"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Backfill backend slugs from names and enforce uniqueness."""

    op.add_column("database_registries", sa.Column("slug", sa.String(length=128), nullable=True))
    op.add_column("storage_registries", sa.Column("slug", sa.String(length=128), nullable=True))

    connection = op.get_bind()

    database_rows = connection.execute(sa.text("SELECT id, name FROM database_registries")).all()
    for registry_id, name in database_rows:
        connection.execute(
            sa.text("UPDATE database_registries SET slug = :slug WHERE id = :id"),
            {"slug": slugify(name), "id": registry_id},
        )

    storage_rows = connection.execute(sa.text("SELECT id, name FROM storage_registries")).all()
    for registry_id, name in storage_rows:
        connection.execute(
            sa.text("UPDATE storage_registries SET slug = :slug WHERE id = :id"),
            {"slug": slugify(name), "id": registry_id},
        )

    # SQLite needs batch mode to rebuild the tables when tightening constraints.
    with op.batch_alter_table("database_registries") as batch_op:
        batch_op.alter_column("slug", existing_type=sa.String(length=128), nullable=False)
        batch_op.create_unique_constraint("uq_database_registries_slug", ["slug"])

    with op.batch_alter_table("storage_registries") as batch_op:
        batch_op.alter_column("slug", existing_type=sa.String(length=128), nullable=False)
        batch_op.create_unique_constraint("uq_storage_registries_slug", ["slug"])


def downgrade() -> None:
    """Drop the backend slug columns and constraints."""

    with op.batch_alter_table("storage_registries") as batch_op:
        batch_op.drop_constraint("uq_storage_registries_slug", type_="unique")
        batch_op.drop_column("slug")

    with op.batch_alter_table("database_registries") as batch_op:
        batch_op.drop_constraint("uq_database_registries_slug", type_="unique")
        batch_op.drop_column("slug")
