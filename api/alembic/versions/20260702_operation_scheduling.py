import sqlalchemy as sa
from alembic import op

revision = "20260702_operation_scheduling"
down_revision = "20260701_local_minio_credentials"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add scheduling and organization references to operations."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("operations")}
    existing_checks = {constraint["name"] for constraint in inspector.get_check_constraints("operations")}

    with op.batch_alter_table("operations") as batch_op:
        if "operation_kind_enum" in existing_checks:
            batch_op.drop_constraint("operation_kind_enum", type_="check")
        batch_op.create_check_constraint(
            "operation_kind_enum",
            "kind IN ('application.create', 'application.delete', 'organization.delete')",
        )
        if "organization_id" not in existing_columns:
            batch_op.add_column(sa.Column("organization_id", sa.Uuid(), nullable=True))
        if "scheduled_at" not in existing_columns:
            batch_op.add_column(sa.Column("scheduled_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Remove operation scheduling fields."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("operations")}
    existing_checks = {constraint["name"] for constraint in inspector.get_check_constraints("operations")}

    with op.batch_alter_table("operations") as batch_op:
        if "operation_kind_enum" in existing_checks:
            batch_op.drop_constraint("operation_kind_enum", type_="check")
        batch_op.create_check_constraint(
            "operation_kind_enum",
            "kind IN ('application.create', 'application.delete')",
        )
        if "scheduled_at" in existing_columns:
            batch_op.drop_column("scheduled_at")
        if "organization_id" in existing_columns:
            batch_op.drop_column("organization_id")
