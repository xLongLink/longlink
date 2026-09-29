from collections.abc import Sequence
from longlink.shared.models import User
from sqlalchemy.ext.asyncio import AsyncConnection
from sqlalchemy.dialects.postgresql import insert as postgres_insert


async def sync(conn: AsyncConnection, rows: Sequence[User]) -> None:
    """Upsert shared user rows; the caller owns the shared-schema connection and transaction."""

    # An empty snapshot leaves the shared table unchanged.
    if not rows:
        return

    # Build one PostgreSQL upsert for the SDK-owned shared user table.
    statement = postgres_insert(User.metadata.tables["audit"])

    # Update the shared user profile from the Platform snapshot.
    await conn.execute(
        statement.on_conflict_do_update(
            index_elements=[statement.table.c.id],
            set_={
                "name": statement.excluded.name,
                "email": statement.excluded.email,
                "avatar": statement.excluded.avatar,
            },
        ),
        [row.model_dump() for row in rows],
    )
