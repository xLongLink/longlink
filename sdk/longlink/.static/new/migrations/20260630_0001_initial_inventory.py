"""
Revision ID: 20260630_0001
Revises:
Create Date: 2026-06-30 00:00:00.000000
"""

import sqlmodel
import sqlalchemy as sa
from alembic import op

revision = "20260630_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Apply the initial inventory schema."""

    op.create_table(
        "inventory_items",
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_id", sa.Integer(), nullable=True),
        sa.Column("updated_id", sa.Integer(), nullable=True),
        sa.Column("deleted_id", sa.Integer(), nullable=True),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("sku", sqlmodel.sql.sqltypes.AutoString(length=64), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["created_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["updated_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["deleted_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("inventory_items", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_inventory_items_sku"), ["sku"], unique=False)


def downgrade() -> None:
    """Remove the initial inventory schema."""

    with op.batch_alter_table("inventory_items", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_inventory_items_sku"))

    op.drop_table("inventory_items")
