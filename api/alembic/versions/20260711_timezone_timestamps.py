import sqlalchemy as sa
from alembic import op

revision = "20260711_timezone_timestamps"
down_revision = "20260711_drop_storage_bucket_prefix"
branch_labels = None
depends_on = None

TIMESTAMP_COLUMNS = {
    "applications": {
        "created_at": False,
        "updated_at": False,
        "deleted_at": True,
    },
    "compute_registries": {
        "created_at": False,
        "updated_at": False,
        "deleted_at": True,
    },
    "database_registries": {
        "created_at": False,
        "updated_at": False,
        "deleted_at": True,
    },
    "locations": {
        "created_at": False,
        "updated_at": False,
        "deleted_at": True,
    },
    "operations": {
        "created_at": False,
        "updated_at": False,
        "started_at": True,
        "stopped_at": True,
        "scheduled_at": True,
        "lease_expires_at": True,
    },
    "organization_invitations": {
        "created_at": False,
        "updated_at": False,
        "deleted_at": True,
    },
    "organizations": {
        "created_at": False,
        "updated_at": False,
        "deleted_at": True,
    },
    "storage_registries": {
        "created_at": False,
        "updated_at": False,
        "deleted_at": True,
    },
    "user_applications": {
        "created_at": False,
        "updated_at": False,
        "deleted_at": True,
    },
    "user_organizations": {
        "created_at": False,
        "updated_at": False,
        "deleted_at": True,
    },
    "users": {
        "created_at": False,
        "updated_at": False,
        "deleted_at": True,
    },
}


def upgrade() -> None:
    """Store model timestamps as timezone-aware UTC values."""

    # Alter only tables and columns that exist so partially migrated local databases can recover.
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    for table_name, columns in TIMESTAMP_COLUMNS.items():
        if table_name not in existing_tables:
            continue

        existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
        with op.batch_alter_table(table_name) as batch_op:
            for column_name, nullable in columns.items():
                if column_name not in existing_columns:
                    continue

                batch_op.alter_column(
                    column_name,
                    existing_type=sa.DateTime(),
                    type_=sa.DateTime(timezone=True),
                    nullable=nullable,
                    postgresql_using=f"{column_name} AT TIME ZONE 'UTC'",
                )


def downgrade() -> None:
    """Restore model timestamps to timezone-naive columns."""

    # Keep stored values in UTC when rolling back to timestamp without time zone.
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    for table_name, columns in TIMESTAMP_COLUMNS.items():
        if table_name not in existing_tables:
            continue

        existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
        with op.batch_alter_table(table_name) as batch_op:
            for column_name, nullable in columns.items():
                if column_name not in existing_columns:
                    continue

                batch_op.alter_column(
                    column_name,
                    existing_type=sa.DateTime(timezone=True),
                    type_=sa.DateTime(),
                    nullable=nullable,
                    postgresql_using=f"{column_name} AT TIME ZONE 'UTC'",
                )
