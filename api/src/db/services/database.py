from sqlalchemy import select
from src.db.models import DatabaseRegistry
from src.models.kinds import DatabaseKind

from .base import ServiceBase


class DatabaseRegistriesService(ServiceBase):
    """Manage database backend registrations."""

    async def list(self) -> list[DatabaseRegistry]:
        """Return all registered database backends."""

        async with self.session() as session:
            result = await session.execute(select(DatabaseRegistry))
            return list(result.scalars().all())

    async def get(self, name: str) -> DatabaseRegistry | None:
        """Return one database backend by name."""

        async with self.session() as session:
            result = await session.execute(select(DatabaseRegistry).where(DatabaseRegistry.name == name))
            return result.scalar_one_or_none()

    async def create(
        self,
        kind: DatabaseKind,
        name: str,
        host: str,
        port: int,
        username: str,
        password: str,
        sslmode: str | None = None,
        maintenance_database: str = "postgres",
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
                    sslmode=sslmode,
                    maintenance_database=maintenance_database,
                )
                session.add(database)
            else:
                database.kind = kind
                database.host = host
                database.port = port
                database.username = username
                database.password = password
                database.sslmode = sslmode
                database.maintenance_database = maintenance_database

            await session.commit()
            await session.refresh(database)
            return database

    async def delete(self, name: str) -> DatabaseRegistry | None:
        """Delete one database backend registration."""

        async with self.session() as session:
            result = await session.execute(select(DatabaseRegistry).where(DatabaseRegistry.name == name))
            database = result.scalar_one_or_none()
            # Return early when the registration does not exist.
            if database is None:
                return None

            await session.delete(database)
            await session.commit()
            return database
