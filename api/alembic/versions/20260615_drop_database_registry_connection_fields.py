"""Drop database registry connection fields.

Revision ID: 20260615_drop_database_registry_connection_fields
Revises: 20260614_drop_operation_payload_add_links
Create Date: 2026-06-15 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260615_drop_database_registry_connection_fields"
down_revision = "20260614_drop_operation_payload_add_links"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Drop registry fields that are now adapter defaults."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("database_registries")}

    if "sslmode" in columns:
        op.drop_column("database_registries", "sslmode")

    if "maintenance_database" in columns:
        op.drop_column("database_registries", "maintenance_database")


def downgrade() -> None:
    """Restore the dropped registry fields."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("database_registries")}

    if "sslmode" not in columns:
        op.add_column("database_registries", sa.Column("sslmode", sa.String(length=32), nullable=True))

    if "maintenance_database" not in columns:
        op.add_column(
            "database_registries",
            sa.Column("maintenance_database", sa.String(length=255), nullable=False, server_default=sa.text("'postgres'")),
        )
