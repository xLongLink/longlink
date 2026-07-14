from uuid import UUID
from typing import TypedDict
from datetime import datetime
from sqlalchemy.engine import URL
from longlink.shared.models import shared_users_table
from sqlalchemy.ext.asyncio import AsyncConnection, create_async_engine
from sqlalchemy.dialects.postgresql import insert as postgres_insert


class UserRow(TypedDict):
    """Represent one platform-owned row in an organization shared schema."""

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


async def sync_url(database_url: str | URL, users: list[UserRow]) -> None:
    """Upsert shared users through a control-plane database URL."""

    # Open a short-lived engine because organization databases are selected dynamically.
    engine = create_async_engine(database_url)

    # Dispose the operation-scoped engine after synchronization completes.
    try:
        async with engine.begin() as conn:
            await sync(conn, users)
    finally:
        await engine.dispose()


async def sync(conn: AsyncConnection, users: list[UserRow]) -> None:
    """Upsert the complete shared user state provided by the control plane."""

    # Empty payloads do not imply deactivation because inactive users are sent explicitly.
    if not users:
        return

    # Build one PostgreSQL upsert for the SDK-owned shared users table.
    insert_statement = postgres_insert(shared_users_table)
    excluded = insert_statement.excluded

    # Preserve creation time while updating the current profile, role, and activation state.
    await conn.execute(
        insert_statement.on_conflict_do_update(
            index_elements=[shared_users_table.c.id],
            set_={
                "name": excluded.name,
                "email": excluded.email,
                "avatar": excluded.avatar,
                "role": excluded.role,
                "updated_at": excluded.updated_at,
                "deleted_at": excluded.deleted_at,
            },
        ),
        users,
    )
