from datetime import UTC, datetime
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from src.database.session import session_scope
from src.models.database import DatabaseKind
from src.database.models.database import DatabaseRegistry
from src.database.models.users import User


class DatabaseService:
    """Manage database backend registrations."""

    async def list(self) -> list[DatabaseRegistry]:
        """Return all registered database backends."""

        async with session_scope() as session:
            statement = select(DatabaseRegistry).options(
                selectinload(DatabaseRegistry.created_by),
                selectinload(DatabaseRegistry.updated_by),
                selectinload(DatabaseRegistry.deleted_by),
            )
            result = await session.execute(statement)
            return result.scalars().all()

    async def get(self, registry_id: str) -> DatabaseRegistry | None:
        """Return one database backend by id."""

        async with session_scope() as session:
            statement = select(DatabaseRegistry).options(
                selectinload(DatabaseRegistry.created_by),
                selectinload(DatabaseRegistry.updated_by),
                selectinload(DatabaseRegistry.deleted_by),
            ).where(DatabaseRegistry.id == registry_id)
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def create(
        self,
        kind: DatabaseKind,
        name: str,
        host: str,
        port: int,
        username: str,
        password: str,
        location_id: str,
        user: User,
    ) -> DatabaseRegistry:
        """Create or update one database backend registration."""

        async with session_scope() as session:
            result = await session.execute(select(DatabaseRegistry).where(DatabaseRegistry.name == name))
            database = result.scalar_one_or_none()

            # Create a new registration or refresh the stored connection data.
            if database is None:
                database = DatabaseRegistry(
                    kind=kind,
                    name=name,
                    host=host,
                    port=port,
                    username=username,
                    password=password,
                    location_id=location_id,
                )
                database.created_id = user.id
                database.updated_id = user.id
                session.add(database)
            else:
                database.kind = kind
                database.host = host
                database.port = port
                database.username = username
                database.password = password
                database.location_id = location_id
                database.updated_id = user.id
                database.deleted_at = None
                database.deleted_id = None

            await session.commit()
            await session.refresh(database)
            statement = (
                select(DatabaseRegistry)
                .options(
                    selectinload(DatabaseRegistry.created_by),
                    selectinload(DatabaseRegistry.updated_by),
                    selectinload(DatabaseRegistry.deleted_by),
                )
                .where(DatabaseRegistry.name == name)
            )
            result = await session.execute(statement)
            return result.scalar_one()

    async def delete(self, registry_id: str, deleted_id: str | None = None) -> DatabaseRegistry | None:
        """Mark one database backend registration as deleted."""

        async with session_scope() as session:
            statement = select(DatabaseRegistry).options(
                selectinload(DatabaseRegistry.created_by),
                selectinload(DatabaseRegistry.updated_by),
                selectinload(DatabaseRegistry.deleted_by),
            ).where(DatabaseRegistry.id == registry_id)
            result = await session.execute(statement)
            database = result.scalar_one_or_none()
            if database is None:
                return None

            # Keep the row until cleanup can remove the backing resources.
            database.deleted_at = datetime.now(UTC)
            database.deleted_id = deleted_id
            database.updated_id = deleted_id
            await session.commit()
            await session.refresh(database)
            return database


    async def purge(self, registry_id: str) -> DatabaseRegistry | None:
        """Hard delete one database backend registration."""

        async with session_scope() as session:
            result = await session.execute(select(DatabaseRegistry).where(DatabaseRegistry.id == registry_id))
            database = result.scalar_one_or_none()
            if database is None:
                return None

            await session.delete(database)
            await session.commit()
            return database


database = DatabaseService()
