"""Add app delete operation support.

Revision ID: 20260619_add_app_delete_operation
Revises: 20260618_drop_operation_status_registry_id
Create Date: 2026-06-19 00:00:00.000000
"""

from alembic import op

revision = "20260619_add_app_delete_operation"
down_revision = "20260618_drop_operation_status_registry_id"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Allow app delete operations and deleting app status."""

    with op.batch_alter_table("operations") as batch_op:
        batch_op.drop_constraint("operation_kind_check", type_="check")
        batch_op.create_check_constraint("operation_kind_check", "kind IN ('app.create', 'app.delete')")


def downgrade() -> None:
    """Remove app delete from supported operation kinds."""

    with op.batch_alter_table("operations") as batch_op:
        batch_op.drop_constraint("operation_kind_check", type_="check")
        batch_op.create_check_constraint("operation_kind_check", "kind IN ('app.create')")
