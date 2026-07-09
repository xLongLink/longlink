from sqlalchemy.ext.asyncio import AsyncConnection
from sqlalchemy.dialects.postgresql import insert as postgres_insert

from tenant.models.users import User
from tenant.database.models.users import shared_users_table


class UsersService:
    """Manage tenant shared user rows."""

    async def sync(self, conn: AsyncConnection, users: list[User]) -> None:
        """Upsert the complete shared user state provided by the control plane."""

        # Empty payloads do not imply deactivation; the API sends inactive users explicitly.
        if not users:
            return

        rows = []

        # Convert API user models to the shared table column names.
        for user in users:

            # The Python model exposes `role`; the shared table stores the historical `role_name` column.
            row = user.model_dump(exclude={"role"})
            row["role_name"] = user.role
            rows.append(row)

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
                    "role_name": excluded.role_name,
                    "updated_at": excluded.updated_at,
                    "deleted_at": excluded.deleted_at,
                },
            ),
            rows,
        )


users = UsersService()
