from uuid import UUID
from typing import TypedDict
from datetime import datetime
from longlink.database import urls
from sqlalchemy.engine import URL
from longlink.shared.models import AuditUser
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.dialects.postgresql import insert as postgres_insert


class AuditRow(TypedDict):
    """Represent one Platform-owned row in an Organization shared audit table."""

    # Identifier
    id: UUID

    # Metadata
    name: str
    role: str
    email: str
    avatar: str

    # Audit
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None


async def sync(database_url: str | URL, rows: list[AuditRow]) -> None:
    """Upsert shared audit rows through a control-plane database URL."""

    # Empty payloads do not imply deactivation because inactive users are sent explicitly.
    if not rows:
        return

    # Open a short-lived engine because organization databases are selected dynamically.
    connect_args = urls.connect_args(database_url)
    engine = create_async_engine(
        database_url,
        **({"connect_args": connect_args} if connect_args else {}),
    )

    # Dispose the operation-scoped engine after synchronization completes.
    try:
        async with engine.begin() as conn:
            # Build one PostgreSQL upsert for the SDK-owned shared audit table.
            statement = postgres_insert(getattr(AuditUser, "__table__"))
            excluded = statement.excluded

            # Preserve creation time while updating the current profile, role, and activation state.
            await conn.execute(
                statement.on_conflict_do_update(
                    index_elements=[statement.table.c.id],
                    set_={
                        "name": excluded.name,
                        "email": excluded.email,
                        "avatar": excluded.avatar,
                        "role": excluded.role,
                        "updated_at": excluded.updated_at,
                        "deleted_at": excluded.deleted_at,
                    },
                ),
                rows,
            )
    finally:
        await engine.dispose()
