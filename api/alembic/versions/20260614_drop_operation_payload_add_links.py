"""Drop operation payload and add typed links.

Revision ID: 20260614_drop_operation_payload_add_links
Revises: 20260613_add_app_status
Create Date: 2026-06-14 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260614_drop_operation_payload_add_links"
down_revision = "20260613_add_app_status"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Replace the JSON payload with typed foreign-key columns."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("operations")}

    if "app_id" not in columns:
        op.add_column("operations", sa.Column("app_id", sa.Integer(), nullable=True))

    if "registry_id" not in columns:
        op.add_column("operations", sa.Column("registry_id", sa.Integer(), nullable=True))

    if "payload" in columns:
        op.drop_column("operations", "payload")


def downgrade() -> None:
    """Restore the JSON payload column."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("operations")}

    if "payload" not in columns:
        op.add_column("operations", sa.Column("payload", sa.JSON(), nullable=False, server_default=sa.text("'{}'")))

    if "registry_id" in columns:
        op.drop_column("operations", "registry_id")

    if "app_id" in columns:
        op.drop_column("operations", "app_id")
