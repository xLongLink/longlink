from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from .base import ServiceBase
from src.database.models.database import DatabaseRegistry
from src.models.kinds import DatabaseKind


class DatabaseService(ServiceBase):
    """Manage database backend registrations."""

    async def list(self) -> list[DatabaseRegistry]:
        """Return all registered database backends."""

        async with self.session() as session:
            statement = select(DatabaseRegistry).options(selectinload(DatabaseRegistry.deleted_by))
            result = await session.execute(statement)
            return result.scalars().all()

    async def get(self, name: str) -> DatabaseRegistry | None:
        """Return one database backend by name."""

        async with self.session() as session:
            statement = select(DatabaseRegistry).options(selectinload(DatabaseRegistry.deleted_by)).where(DatabaseRegistry.name == name)
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
        location_id: int,
    ) -> DatabaseRegistry:
        """Create or update one database backend registration."""

        async with self.session() as session:
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
                session.add(database)
            else:
                database.kind = kind
                database.host = host
                database.port = port
                database.username = username
                database.password = password
                database.location_id = location_id
                database.deleted_at = None
                database.deleted_by_id = None

            await session.commit()
            await session.refresh(database)
            return database

    async def delete(self, name: str, deleted_by_id: int | None = None) -> DatabaseRegistry | None:
        """Mark one database backend registration as deleted."""

        async with self.session() as session:
            statement = select(DatabaseRegistry).options(selectinload(DatabaseRegistry.deleted_by)).where(DatabaseRegistry.name == name)
            result = await session.execute(statement)
            database = result.scalar_one_or_none()
            if database is None:
                return None

            # Keep the row until cleanup can remove the backing resources.
            database.deleted_at = datetime.now(UTC)
            database.deleted_by_id = deleted_by_id
            await session.commit()
            await session.refresh(database)
            return database


    async def purge(self, name: str) -> DatabaseRegistry | None:
        """Hard delete one database backend registration."""

        async with self.session() as session:
            result = await session.execute(select(DatabaseRegistry).where(DatabaseRegistry.name == name))
            database = result.scalar_one_or_none()
            if database is None:
                return None

            await session.delete(database)
            await session.commit()
            return database


database = DatabaseService()
