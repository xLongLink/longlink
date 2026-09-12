from collections.abc import Sequence
from longlink.shared.models import Audit
from sqlalchemy.ext.asyncio import AsyncConnection
from sqlalchemy.dialects.postgresql import insert as postgres_insert


async def sync(conn: AsyncConnection, rows: Sequence[Audit]) -> None:
    """Upsert shared audit rows; the caller owns the shared-schema connection and transaction."""

    # Empty payloads do not imply deactivation because inactive users are sent explicitly.
    if not rows:
        return

    # Build one PostgreSQL upsert for the SDK-owned shared audit table.
    statement = postgres_insert(Audit.metadata.tables["audit"])

    # Preserve creation time while updating the current profile, role, and activation state.
    await conn.execute(
        statement.on_conflict_do_update(
            index_elements=[statement.table.c.id],
            set_={
                "name": statement.excluded.name,
                "email": statement.excluded.email,
                "avatar": statement.excluded.avatar,
                "role": statement.excluded.role,
                "updated_at": statement.excluded.updated_at,
                "deleted_at": statement.excluded.deleted_at,
            },
        ),
        [row.model_dump() for row in rows],
    )
