from uuid import UUID
from sqlalchemy import func, update
from sqlalchemy.ext.asyncio import AsyncConnection
from sqlalchemy.dialects.postgresql import insert as postgres_insert

from tenant.models.users import User
from tenant.database.models.users import shared_users_table


class UsersService:
    """Manage tenant shared user rows."""

    async def sync(self, conn: AsyncConnection, users: list[User]) -> None:
        """Upsert active users and soft-delete stale shared users."""

        if users:
            rows = []
            for user in users:
                # The Python model exposes `role`; the shared table stores the historical `role_name` column.
                row = user.model_dump(exclude={"role"})
                row["role_name"] = user.role
                rows.append(row)

            insert_statement = postgres_insert(shared_users_table)
            excluded = insert_statement.excluded

            # Keep shared users aligned with active control-plane memberships.
            await conn.execute(
                insert_statement.on_conflict_do_update(
                    index_elements=[shared_users_table.c.id],
                    set_={
                        "name": excluded.name,
                        "email": excluded.email,
                        "avatar": excluded.avatar,
                        "role_name": excluded.role_name,
                        "created_at": excluded.created_at,
                        "updated_at": excluded.updated_at,
                        "deleted_at": None,
                    },
                ),
                rows,
            )

            active_user_ids = [user.id for user in users]
            await self._soft_delete_stale(conn, active_user_ids)
            return

        await self._soft_delete_stale(conn)


    async def _soft_delete_stale(self, conn: AsyncConnection, active_user_ids: list[UUID] | None = None) -> None:
        """Soft-delete shared users that are no longer active."""

        statement = update(shared_users_table).where(shared_users_table.c.deleted_at.is_(None))
        if active_user_ids is not None:
            statement = statement.where(~shared_users_table.c.id.in_(active_user_ids))

        await conn.execute(statement.values(deleted_at=func.now(), updated_at=func.now()))


users = UsersService()
