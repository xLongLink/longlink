"""Persist organization resource allocations and preserve legacy invoice pricing."""

import sqlalchemy as sa
from uuid import uuid4
from alembic import op
from datetime import UTC, datetime, timedelta
from sqlmodel.sql.sqltypes import UTCDateTime

revision = "20261120_0021"
down_revision = "20261120_0020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Preserve existing capacities and require renewed allocation billing consent."""

    # Add allocation columns before copying exact historical storage capacities.
    with op.batch_alter_table("organizations") as batch:
        batch.add_column(sa.Column("compute_cpu_millicores", sa.Integer(), nullable=False, server_default="1500"))
        batch.add_column(sa.Column("compute_ram_bytes", sa.BigInteger(), nullable=False, server_default="1073741824"))
        batch.add_column(sa.Column("storage_bytes", sa.BigInteger(), nullable=True))
        batch.add_column(sa.Column("database_cpu_millicores", sa.Integer(), nullable=False, server_default="1000"))
        batch.add_column(sa.Column("database_ram_bytes", sa.BigInteger(), nullable=False, server_default="1073741824"))
        batch.add_column(sa.Column("database_storage_bytes", sa.BigInteger(), nullable=True))
        batch.add_column(sa.Column("provisioned_at", UTCDateTime(), nullable=True))

    # Pending operations carry desired allocations separately from confirmed organization capacities.
    with op.batch_alter_table("operations") as batch:
        batch.add_column(sa.Column("allocation", sa.JSON(), nullable=True))

    # Use bigint arithmetic so existing paid database volumes cannot overflow PostgreSQL integers.
    organizations = sa.table(
        "organizations",
        sa.column("id", sa.Uuid()),
        sa.column("deleted_at", UTCDateTime()),
        sa.column("compute_ram_bytes", sa.BigInteger()),
        sa.column("compute_cpu_millicores", sa.Integer()),
        sa.column("database_ram_bytes", sa.BigInteger()),
        sa.column("database_cpu_millicores", sa.Integer()),
        sa.column("status", sa.String()),
        sa.column("provisioned_at", UTCDateTime()),
        sa.column("database_size_mib", sa.Integer()),
        sa.column("storage_quota_bytes", sa.BigInteger()),
        sa.column("storage_bytes", sa.BigInteger()),
        sa.column("database_storage_bytes", sa.BigInteger()),
        sa.column("stripe_checkout_id", sa.String()),
        sa.column("stripe_checkout_key", sa.Uuid()),
        sa.column("stripe_payment_method_id", sa.String()),
        sa.column("invoice_due_at", UTCDateTime()),
    )
    database_bytes = sa.cast(organizations.c.database_size_mib, sa.BigInteger()) * 1048576
    deadline = (datetime.now(UTC).replace(day=28) + timedelta(days=4)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    op.execute(
        organizations.update().values(
            database_storage_bytes=database_bytes,
            storage_bytes=organizations.c.storage_quota_bytes,
            stripe_checkout_id=None,
            stripe_checkout_key=None,
            stripe_payment_method_id=None,
            invoice_due_at=sa.case((organizations.c.invoice_due_at > deadline, organizations.c.invoice_due_at), else_=deadline),
        )
    )

    # Preserve per-solution workload budgets plus one live revision overlap under shared namespace quotas.
    solutions = sa.table("solutions", sa.column("organization_id", sa.Uuid()), sa.column("deleted_at", UTCDateTime()))
    solution_count = (
        sa.select(sa.func.count())
        .select_from(solutions)
        .where(solutions.c.organization_id == organizations.c.id, solutions.c.deleted_at.is_(None))
        .scalar_subquery()
    )
    slots = sa.case((solution_count > 1, solution_count), else_=1)
    op.execute(organizations.update().values(compute_cpu_millicores=500 + slots * 1000, compute_ram_bytes=536870912 + slots * 536870912))

    # Only previously running tenants have a known successfully provisioned allocation.
    op.execute(organizations.update().where(organizations.c.status == "running").values(provisioned_at=datetime.now(UTC)))

    # Reconcile every retained active tenant even when no future settings edit occurs.
    connection = op.get_bind()
    operations = sa.table(
        "operations",
        sa.column("id", sa.Uuid()),
        sa.column("kind", sa.String()),
        sa.column("target_id", sa.Uuid()),
        sa.column("created_at", UTCDateTime()),
        sa.column("updated_at", UTCDateTime()),
    )
    now = datetime.now(UTC)
    for organization_id in connection.scalars(sa.select(organizations.c.id).where(organizations.c.deleted_at.is_(None))):
        connection.execute(
            operations.insert().values(id=uuid4(), kind="organization.create", target_id=organization_id, created_at=now, updated_at=now)
        )

    # Remove legacy storage columns and temporary backfill defaults.
    with op.batch_alter_table("organizations") as batch:
        batch.alter_column("storage_bytes", existing_type=sa.BigInteger(), nullable=False)
        batch.alter_column("database_storage_bytes", existing_type=sa.BigInteger(), nullable=False)
        batch.alter_column("compute_cpu_millicores", existing_type=sa.Integer(), server_default=None)
        batch.alter_column("compute_ram_bytes", existing_type=sa.BigInteger(), server_default=None)
        batch.alter_column("database_cpu_millicores", existing_type=sa.Integer(), server_default=None)
        batch.alter_column("database_ram_bytes", existing_type=sa.BigInteger(), server_default=None)
        batch.drop_column("database_size_mib")
        batch.drop_column("storage_quota_bytes")

    # Preserve all pending invoice identities, usage, provider references, and legacy recovery semantics.
    with op.batch_alter_table("invoices") as batch:
        batch.add_column(sa.Column("pricing_version", sa.Integer(), nullable=False, server_default="1"))
        batch.add_column(sa.Column("cpu_millicores", sa.Integer(), nullable=False, server_default="0"))
        batch.add_column(sa.Column("ram_bytes", sa.BigInteger(), nullable=False, server_default="0"))

    with op.batch_alter_table("invoices") as batch:
        batch.alter_column("pricing_version", existing_type=sa.Integer(), server_default=None)
        batch.alter_column("cpu_millicores", existing_type=sa.Integer(), server_default=None)
        batch.alter_column("ram_bytes", existing_type=sa.BigInteger(), server_default=None)


def downgrade() -> None:
    """Restore legacy capacity columns without silently restoring obsolete billing consent."""

    # Refuse to reinterpret new allocation invoices as legacy metered charges.
    invoices = sa.table("invoices", sa.column("pricing_version", sa.Integer()))
    connection = op.get_bind()
    allocated = connection.scalar(sa.select(sa.func.count()).select_from(invoices).where(invoices.c.pricing_version != 1))
    if allocated:
        raise RuntimeError("Allocation invoices must be archived before downgrading billing")

    # Round database storage upward only when returning to the legacy MiB-only schema.
    with op.batch_alter_table("organizations") as batch:
        batch.add_column(sa.Column("database_size_mib", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("storage_quota_bytes", sa.BigInteger(), nullable=True))

    organizations = sa.table(
        "organizations",
        sa.column("database_size_mib", sa.Integer()),
        sa.column("storage_quota_bytes", sa.BigInteger()),
        sa.column("storage_bytes", sa.BigInteger()),
        sa.column("database_storage_bytes", sa.BigInteger()),
    )
    op.execute(
        organizations.update().values(
            database_size_mib=sa.cast((organizations.c.database_storage_bytes + 1048575) // 1048576, sa.Integer()),
            storage_quota_bytes=organizations.c.storage_bytes,
        )
    )

    with op.batch_alter_table("organizations") as batch:
        batch.alter_column("database_size_mib", existing_type=sa.Integer(), nullable=False)
        batch.alter_column("storage_quota_bytes", existing_type=sa.BigInteger(), nullable=False)
        batch.drop_column("compute_cpu_millicores")
        batch.drop_column("compute_ram_bytes")
        batch.drop_column("storage_bytes")
        batch.drop_column("database_cpu_millicores")
        batch.drop_column("database_ram_bytes")
        batch.drop_column("database_storage_bytes")
        batch.drop_column("provisioned_at")

    with op.batch_alter_table("operations") as batch:
        batch.drop_column("allocation")

    with op.batch_alter_table("invoices") as batch:
        batch.drop_column("pricing_version")
        batch.drop_column("cpu_millicores")
        batch.drop_column("ram_bytes")
