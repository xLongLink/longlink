from sqlalchemy.engine import URL
from sqlalchemy.ext.asyncio import AsyncConnection, create_async_engine
from longlink.tenant.models.users import User
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from longlink.tenant.database.models.users import shared_users_table


class UsersService:
    """Manage tenant shared user rows."""

    async def sync_url(self, database_url: str | URL, users: list[User]) -> None:
        """Upsert shared users through a tenant shared-schema database URL."""

        # Open a short-lived engine so callers only need the tenant database URL.
        engine = create_async_engine(database_url)

        # Dispose the engine after the synchronization attempt completes.
        try:
            async with engine.begin() as conn:
                await self.sync(conn, users)
        finally:
            await engine.dispose()

    async def sync(self, conn: AsyncConnection, users: list[User]) -> None:
        """Upsert the complete shared user state provided by the LongLink Platform."""

        # Empty payloads do not imply deactivation; the API sends inactive users explicitly.
        if not users:
            return

        # Convert API user models to shared table rows.
        rows = [user.model_dump() for user in users]

        insert_statement = postgres_insert(shared_users_table)
        excluded = insert_statement.excluded

        # The API payload is the source of truth, including activation state through `deleted_at`.
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
            rows,
        )


users = UsersService()
