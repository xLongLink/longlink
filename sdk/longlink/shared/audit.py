from longlink.database import urls
from sqlalchemy.engine import URL
from longlink.shared.models import Audit
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.dialects.postgresql import insert as postgres_insert


async def sync(database_url: str | URL, rows: list[Audit]) -> None:
    """Upsert shared audit rows through a control-plane database URL."""

    # Empty payloads do not imply deactivation because inactive users are sent explicitly.
    if not rows:
        return

    # Open a short-lived engine because organization databases are selected dynamically.
    engine = create_async_engine(
        database_url,
        connect_args=urls.connect_args(database_url),
    )

    # Dispose the operation-scoped engine after synchronization completes.
    try:
        async with engine.begin() as conn:
            # Build one PostgreSQL upsert for the SDK-owned shared audit table.
            statement = postgres_insert(getattr(Audit, "__table__"))
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
    finally:
        await engine.dispose()
