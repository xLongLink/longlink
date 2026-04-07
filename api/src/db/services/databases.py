import re
import asyncio
import psycopg2
from psycopg2 import sql
from sqlalchemy import select
from src.db.models import DatabaseConnection
from src.db.session import get_session

_DATABASE_NAME_PATTERN = re.compile(r'^[A-Za-z_][A-Za-z0-9_]*$')


class DatabasesService:
    async def list(self) -> list[DatabaseConnection]:
        Session = await get_session()
        async with Session() as session:
            result = await session.execute(select(DatabaseConnection))
            return list(result.scalars().all())

    async def get(self, name: str) -> DatabaseConnection | None:
        Session = await get_session()
        async with Session() as session:
            result = await session.execute(select(DatabaseConnection).where(DatabaseConnection.name == name))
            return result.scalar_one_or_none()

    async def set(
        self,
        *,
        name: str,
        host: str,
        port: int,
        username: str,
        password: str,
        maintenance_database: str,
        sslmode: str | None,
    ) -> DatabaseConnection:
        Session = await get_session()
        async with Session() as session:
            result = await session.execute(select(DatabaseConnection).where(DatabaseConnection.name == name))
            connection = result.scalar_one_or_none()

            if connection is None:
                connection = DatabaseConnection(
                    name=name,
                    host=host,
                    port=port,
                    username=username,
                    password=password,
                    maintenance_database=maintenance_database,
                    sslmode=sslmode,
                )
                session.add(connection)
            else:
                connection.host = host
                connection.port = port
                connection.username = username
                connection.password = password
                connection.maintenance_database = maintenance_database
                connection.sslmode = sslmode

            await session.commit()
            await session.refresh(connection)
            return connection

    async def delete(self, name: str) -> bool:
        Session = await get_session()
        async with Session() as session:
            result = await session.execute(select(DatabaseConnection).where(DatabaseConnection.name == name))
            connection = result.scalar_one_or_none()
            if connection is None:
                return False

            await session.delete(connection)
            await session.commit()
            return True

    async def create_database(self, *, connection: DatabaseConnection, database_name: str) -> None:
        if not _DATABASE_NAME_PATTERN.fullmatch(database_name):
            raise ValueError('Database name must start with a letter/underscore and contain only letters, numbers, and underscores')

        await asyncio.to_thread(self._create_database_sync, connection, database_name)

    @staticmethod
    def _create_database_sync(connection: DatabaseConnection, database_name: str) -> None:
        connection_kwargs: dict[str, str | int] = {
            'host': connection.host,
            'port': connection.port,
            'user': connection.username,
            'password': connection.password,
            'dbname': connection.maintenance_database,
        }
        if connection.sslmode:
            connection_kwargs['sslmode'] = connection.sslmode

        with psycopg2.connect(**connection_kwargs) as admin_connection:
            admin_connection.autocommit = True
            with admin_connection.cursor() as cursor:
                cursor.execute('SELECT 1 FROM pg_database WHERE datname = %s', (database_name,))
                if cursor.fetchone() is not None:
                    raise ValueError(f"Database '{database_name}' already exists")

                cursor.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(database_name)))
