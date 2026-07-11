from tenant.models.users import User
from sqlalchemy.ext.asyncio import AsyncConnection
from tenant.database.models.users import shared_users_table
from sqlalchemy.dialects.postgresql import insert as postgres_insert


class UsersService:
    """Manage tenant shared user rows."""

    async def sync(self, conn: AsyncConnection, users: list[User]) -> None:
        """Upsert the complete shared user state provided by the control plane."""

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
