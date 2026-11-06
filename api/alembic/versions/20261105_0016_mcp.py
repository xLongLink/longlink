"""Allow explicit multi-Organization MCP grants."""

import sqlalchemy as sa
from alembic import op

revision = "20261105_0016"
down_revision = "20261102_0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Preserve Solution grants while adding gateway Organization selections."""

    # Batch operations also support local SQLite installations.
    for table in ("mcp_codes", "mcp_tokens"):
        with op.batch_alter_table(table) as batch:
            batch.alter_column("solution_id", existing_type=sa.Uuid(), nullable=True)
            batch.add_column(sa.Column("organization_ids", sa.JSON(), nullable=True))

        # Backfill without a JSON server default, which older MySQL versions reject.
        record = sa.table(table, sa.column("organization_ids", sa.JSON()))
        op.execute(record.update().values(organization_ids=[]))
        with op.batch_alter_table(table) as batch:
            batch.alter_column("organization_ids", existing_type=sa.JSON(), nullable=False)


def downgrade() -> None:
    """Discard gateway credentials before restoring Solution-only grants."""

    # Gateway credentials cannot be represented by the previous schema.
    for table in ("mcp_codes", "mcp_tokens"):
        record = sa.table(table, sa.column("solution_id"))
        op.execute(record.delete().where(record.c.solution_id.is_(None)))
        with op.batch_alter_table(table) as batch:
            batch.drop_column("organization_ids")
            batch.alter_column("solution_id", existing_type=sa.Uuid(), nullable=False)
