import sqlalchemy as sa
from alembic import op


revision = "20260629_application_runtime_registries"
down_revision = "20260627_organization_invitations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Store the registries used by each deployed application."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("applications")}
    existing_fks = inspector.get_foreign_keys("applications")

    has_compute_fk = any(
        fk["constrained_columns"] == ["compute_registry_id"] and fk["referred_table"] == "compute_registries"
        for fk in existing_fks
    )
    has_database_fk = any(
        fk["constrained_columns"] == ["database_registry_id"] and fk["referred_table"] == "database_registries"
        for fk in existing_fks
    )
    has_storage_fk = any(
        fk["constrained_columns"] == ["storage_registry_id"] and fk["referred_table"] == "storage_registries"
        for fk in existing_fks
    )

    with op.batch_alter_table("applications") as batch_op:
        if "compute_registry_id" not in existing_columns:
            batch_op.add_column(sa.Column("compute_registry_id", sa.Uuid(), nullable=True))
        if "database_registry_id" not in existing_columns:
            batch_op.add_column(sa.Column("database_registry_id", sa.Uuid(), nullable=True))
        if "storage_registry_id" not in existing_columns:
            batch_op.add_column(sa.Column("storage_registry_id", sa.Uuid(), nullable=True))

        if not has_compute_fk:
            batch_op.create_foreign_key(
                "fk_applications_compute_registry_id_compute_registries",
                "compute_registries",
                ["compute_registry_id"],
                ["id"],
            )

        if not has_database_fk:
            batch_op.create_foreign_key(
                "fk_applications_database_registry_id_database_registries",
                "database_registries",
                ["database_registry_id"],
                ["id"],
            )

        if not has_storage_fk:
            batch_op.create_foreign_key(
                "fk_applications_storage_registry_id_storage_registries",
                "storage_registries",
                ["storage_registry_id"],
                ["id"],
            )


def downgrade() -> None:
    """Remove application registry references."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("applications")}
    existing_fks = {fk["name"] for fk in inspector.get_foreign_keys("applications")}

    with op.batch_alter_table("applications") as batch_op:
        if "fk_applications_database_registry_id_database_registries" in existing_fks:
            batch_op.drop_constraint("fk_applications_database_registry_id_database_registries", type_="foreignkey")
        if "fk_applications_compute_registry_id_compute_registries" in existing_fks:
            batch_op.drop_constraint("fk_applications_compute_registry_id_compute_registries", type_="foreignkey")
        if "fk_applications_storage_registry_id_storage_registries" in existing_fks:
            batch_op.drop_constraint("fk_applications_storage_registry_id_storage_registries", type_="foreignkey")

        if "storage_registry_id" in existing_columns:
            batch_op.drop_column("storage_registry_id")
        if "database_registry_id" in existing_columns:
            batch_op.drop_column("database_registry_id")
        if "compute_registry_id" in existing_columns:
            batch_op.drop_column("compute_registry_id")
