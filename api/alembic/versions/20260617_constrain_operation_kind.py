"""Constrain operation kinds.

Revision ID: 20260617_constrain_operation_kind
Revises: 20260616_add_operation_step
Create Date: 2026-06-17 00:00:00.000000
"""

from alembic import op

revision = "20260617_constrain_operation_kind"
down_revision = "20260616_add_operation_step"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Limit stored operation kinds to supported values."""

    with op.batch_alter_table("operations") as batch_op:
        batch_op.create_check_constraint("operation_kind_check", "kind IN ('app.create')")


def downgrade() -> None:
    """Remove the operation kind constraint."""

    with op.batch_alter_table("operations") as batch_op:
        batch_op.drop_constraint("operation_kind_check", type_="check")
