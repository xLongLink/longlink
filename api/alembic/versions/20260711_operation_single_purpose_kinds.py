import sqlalchemy as sa
from alembic import op

revision = "20260711_operation_single_purpose_kinds"
down_revision = "20260711_remove_compute_gateway_settings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Replace operation steps with single-purpose operation kinds."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("operations")}
    existing_checks = {constraint["name"] for constraint in inspector.get_check_constraints("operations")}

    # Drop the old enum check before rewriting stored kind values.
    with op.batch_alter_table("operations") as batch_op:
        if "operation_kind_enum" in existing_checks:
            batch_op.drop_constraint("operation_kind_enum", type_="check")

    # Existing rows are metadata-only work records, so kind can absorb the old routing step.
    op.execute(
        "UPDATE operations SET kind = CASE "
        "WHEN kind = 'application.create' THEN 'application.verify' "
        "WHEN kind = 'application.delete' THEN 'application.remove' "
        "WHEN kind = 'organization.delete' THEN 'organization.remove' "
        "ELSE kind END"
    )

    # Enforce the new single-purpose kind set and remove the redundant step column.
    with op.batch_alter_table("operations") as batch_op:
        batch_op.create_check_constraint(
            "operation_kind_enum",
            "kind IN ('application.verify', 'application.remove', 'organization.remove')",
        )
        if "step" in existing_columns:
            batch_op.drop_column("step")


def downgrade() -> None:
    """Restore operation steps and previous kind values."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("operations")}
    existing_checks = {constraint["name"] for constraint in inspector.get_check_constraints("operations")}

    # Add step back as nullable so existing rows can be backfilled before tightening it.
    with op.batch_alter_table("operations") as batch_op:
        if "operation_kind_enum" in existing_checks:
            batch_op.drop_constraint("operation_kind_enum", type_="check")
        if "step" not in existing_columns:
            batch_op.add_column(sa.Column("step", sa.String(length=100), nullable=True))

    # Recreate the previous kind/step combinations for downgraded deployments.
    op.execute(
        "UPDATE operations SET "
        "step = CASE "
        "WHEN kind = 'application.verify' THEN 'verify' "
        "WHEN kind = 'application.remove' THEN 'remove' "
        "WHEN kind = 'organization.remove' THEN 'remove' "
        "ELSE step END, "
        "kind = CASE "
        "WHEN kind = 'application.verify' THEN 'application.create' "
        "WHEN kind = 'application.remove' THEN 'application.delete' "
        "WHEN kind = 'organization.remove' THEN 'organization.delete' "
        "ELSE kind END"
    )

    # Restore the old enum check and step nullability.
    with op.batch_alter_table("operations") as batch_op:
        batch_op.create_check_constraint(
            "operation_kind_enum",
            "kind IN ('application.create', 'application.delete', 'organization.delete')",
        )
        batch_op.alter_column("step", existing_type=sa.String(length=100), nullable=False)
