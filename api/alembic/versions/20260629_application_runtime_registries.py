import sqlalchemy as sa
from alembic import op


revision = "20260629_application_runtime_registries"
down_revision = "20260627_organization_invitations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Store the registries used by each deployed application."""

    op.add_column("applications", sa.Column("compute_registry_id", sa.Uuid(), nullable=True))
    op.add_column("applications", sa.Column("database_registry_id", sa.Uuid(), nullable=True))
    op.add_column("applications", sa.Column("storage_registry_id", sa.Uuid(), nullable=True))
    op.create_foreign_key(
        "fk_applications_compute_registry_id_compute_registries",
        "applications",
        "compute_registries",
        ["compute_registry_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_applications_database_registry_id_database_registries",
        "applications",
        "database_registries",
        ["database_registry_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_applications_storage_registry_id_storage_registries",
        "applications",
        "storage_registries",
        ["storage_registry_id"],
        ["id"],
    )


def downgrade() -> None:
    """Remove application registry references."""

    op.drop_constraint("fk_applications_database_registry_id_database_registries", "applications", type_="foreignkey")
    op.drop_constraint("fk_applications_compute_registry_id_compute_registries", "applications", type_="foreignkey")
    op.drop_constraint("fk_applications_storage_registry_id_storage_registries", "applications", type_="foreignkey")
    op.drop_column("applications", "storage_registry_id")
    op.drop_column("applications", "database_registry_id")
    op.drop_column("applications", "compute_registry_id")
