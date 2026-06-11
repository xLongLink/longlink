"""Drop operation status and registry link.

Revision ID: 20260618_drop_operation_status_registry_id
Revises: 20260617_constrain_operation_kind
Create Date: 2026-06-18 00:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "20260618_drop_operation_status_registry_id"
down_revision = "20260617_constrain_operation_kind"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Remove operation columns that are derived or no longer used."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("operations")}

    with op.batch_alter_table("operations") as batch_op:
        if "status" in columns:
            batch_op.drop_column("status")

        if "registry_id" in columns:
            batch_op.drop_column("registry_id")


def downgrade() -> None:
    """Restore operation status and registry columns."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("operations")}

    with op.batch_alter_table("operations") as batch_op:
        if "registry_id" not in columns:
            batch_op.add_column(sa.Column("registry_id", sa.Integer(), nullable=True))

        if "status" not in columns:
            batch_op.add_column(sa.Column("status", sa.String(length=32), nullable=False, server_default="scheduled"))
