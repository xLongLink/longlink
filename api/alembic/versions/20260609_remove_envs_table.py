"""Remove the control-plane envs table.

Revision ID: 20260609_remove_envs_table
Revises: 20260609_add_app_description
Create Date: 2026-06-09 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlmodel.sql.sqltypes import AutoString


revision = "20260609_remove_envs_table"
down_revision = "20260609_add_app_description"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Drop the legacy envs table when it exists."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "envs" in inspector.get_table_names():
        op.drop_table("envs")


def downgrade() -> None:
    """Recreate the legacy envs table for rollback paths."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "envs" in inspector.get_table_names():
        return

    op.create_table(
        "envs",
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("key", sa.String(length=128), nullable=False),
        sa.Column("value", AutoString(), nullable=False),
        sa.Column("appname", sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["appname"], ["apps.name"]),
    )
