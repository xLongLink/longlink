"""Add operation step tracking.

Revision ID: 20260616_add_operation_step
Revises: 20260615_drop_database_registry_connection_fields
Create Date: 2026-06-16 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "20260616_add_operation_step"
down_revision = "20260615_drop_database_registry_connection_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add the persisted operation step column."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("operations")}

    if "step" not in columns:
        op.add_column("operations", sa.Column("step", sa.String(length=100), nullable=False, server_default="start"))


def downgrade() -> None:
    """Remove the persisted operation step column."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("operations")}

    if "step" in columns:
        op.drop_column("operations", "step")
