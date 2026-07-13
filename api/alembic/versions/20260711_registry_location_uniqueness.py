from alembic import op

revision = "20260711_registry_location_uniqueness"
down_revision = "20260711_timezone_timestamps"
branch_labels = None
depends_on = None

CONSTRAINTS = {
    "compute_registries": "uq_compute_registries_location_id",
    "database_registries": "uq_database_registries_location_id",
    "storage_registries": "uq_storage_registries_location_id",
}


def upgrade() -> None:
    """Allow only one compute, database, and storage registry per location."""

    # Enforce location-owned registry capacity in the platform schema.
    for table, constraint in CONSTRAINTS.items():
        with op.batch_alter_table(table) as batch_op:
            batch_op.create_unique_constraint(constraint, ["location_id"])


def downgrade() -> None:
    """Remove one-registry-per-location constraints."""

    # Restore the previous model that allowed multiple registries in one location.
    for table, constraint in CONSTRAINTS.items():
        with op.batch_alter_table(table) as batch_op:
            batch_op.drop_constraint(constraint, type_="unique")
