from __future__ import annotations


from contextlib import asynccontextmanager

from sqlalchemy import text
from sqlalchemy.engine import URL
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine, create_async_engine
from sqlalchemy.schema import CreateSchema, DropSchema
from sqlalchemy.sql.elements import quoted_name

from src.enviroments import env
from src.utils.namespace import dbname

from .__root__ import Database


class Postgre(Database):
    """PostgreSQL database adapter."""

    def __init__(
        self,
        host: str,
        port: int,
        username: str,
        password: str,
    ) -> None:
        """Initialize the PostgreSQL database adapter.

        Args:
            host: PostgreSQL host.
            port: PostgreSQL port.
            username: PostgreSQL username.
            password: PostgreSQL password.
        """
        self._host = host
        self._port = port
        self._username = username
        self._password = password
        self._sslmode = env.DATABASE_SSLMODE
        self._maintenance_database = "postgres"

    def _url(self, database: str) -> URL:
        """Build one SQLAlchemy URL for the requested database."""

        # Keep the connection details inside the adapter so callers only pass registry fields.
        url = URL.create(
            "postgresql+psycopg",
            username=self._username,
            password=self._password,
            host=self._host,
            port=self._port,
            database=database,
        )
        return url.update_query_dict({"sslmode": self._sslmode})


    @asynccontextmanager
    async def _connection(self, database: str, *, autocommit: bool = False) -> AsyncConnection:
        """Open one managed SQLAlchemy connection for a database.

        The adapter owns the engine lifecycle and disposes it after every operation.
        """

        engine_kwargs: dict[str, object] = {"pool_pre_ping": True}
        if autocommit:
            engine_kwargs["isolation_level"] = "AUTOCOMMIT"

        engine: AsyncEngine = create_async_engine(self._url(database), **engine_kwargs)
        try:
            async with engine.connect() as conn:
                yield conn
        finally:
            await engine.dispose()


    async def _ensure_organization_database(self, organization: str) -> None:
        """Create the organization database when it is missing."""

        database_name_value = dbname(organization)
        async with self._connection(self._maintenance_database, autocommit=True) as conn:
            result = await conn.execute(text("SELECT 1 FROM pg_database WHERE datname = :organization"), {"organization": database_name_value})
            if result.scalar_one_or_none() is None:
                # CREATE DATABASE needs a quoted identifier, so compile it with SQLAlchemy's dialect preparer.
                database_name = conn.engine.sync_engine.dialect.identifier_preparer.quote(database_name_value)
                await conn.exec_driver_sql(f"CREATE DATABASE {database_name}")


    async def database(self, organization: str) -> str:
        """Create the organization database if it does not exist and return a connection DSN."""
        await self._ensure_organization_database(organization)
        return self._url(dbname(organization)).render_as_string(hide_password=False)


    async def schema(self, organization: str, application: str) -> str:
        """Create or replace the schema for one application and return a connection DSN."""
        await self._ensure_organization_database(organization)
        database_name = dbname(organization)

        async with self._connection(database_name) as conn:
            await conn.execute(CreateSchema(quoted_name(application, True), if_not_exists=True))
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS public.users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                )
            """))

        return self._url(database_name).render_as_string(hide_password=False)


    async def remove(self, organization: str, application: str) -> None:
        """Remove one application schema from the organization database."""

        async with self._connection(dbname(organization)) as conn:
            await conn.execute(DropSchema(quoted_name(application, True), cascade=True, if_exists=True))


    async def databases(self) -> list[str]:
        """List all databases on the server, excluding system databases."""

        async with self._connection(self._maintenance_database) as conn:
            result = await conn.execute(
                text("SELECT datname FROM pg_database WHERE datname NOT IN ('postgres', 'template0', 'template1') ORDER BY datname")
            )
            return [row[0] for row in result.fetchall()]


    async def schemas(self, database_name: str) -> list[str]:
        """List all schemas in a database, excluding system schemas."""

        async with self._connection(database_name) as conn:
            result = await conn.execute(
                text("SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast') ORDER BY schema_name")
            )
            return [row[0] for row in result.fetchall()]


    async def delete(self, organization: str) -> None:
        """Delete the entire database for the given organization."""

        database_name_value = dbname(organization)
        async with self._connection(self._maintenance_database, autocommit=True) as conn:
            await conn.execute(
                text(
                    """
                    SELECT pg_terminate_backend(pid)
                    FROM pg_stat_activity
                    WHERE datname = :organization AND pid <> pg_backend_pid()
                    """
                ),
                {"organization": database_name_value},
            )
            database_name = conn.engine.sync_engine.dialect.identifier_preparer.quote(database_name_value)
            await conn.exec_driver_sql(f"DROP DATABASE IF EXISTS {database_name}")


    async def setup(self) -> None:
        """Initialize the PostgreSQL backend used by the control plane."""

        # The backend is provisioned externally; instantiating the adapter is enough here.
        return None


    async def cleanup(self) -> None:
        """Delete all managed PostgreSQL databases."""

        # Drop every non-system database except the maintenance database used for admin operations.
        async with self._connection(self._maintenance_database, autocommit=True) as conn:
            result = await conn.execute(text("SELECT datname FROM pg_database WHERE datname LIKE 'longlink\\_%' ESCAPE '\\'"))
            for row in result.fetchall():
                database = row[0]
                if database == self._maintenance_database:
                    continue

                await conn.execute(
                    text(
                        """
                        SELECT pg_terminate_backend(pid)
                        FROM pg_stat_activity
                        WHERE datname = :database AND pid <> pg_backend_pid()
                        """
                    ),
                    {"database": database},
                )
                database_name = conn.engine.sync_engine.dialect.identifier_preparer.quote(database)
                await conn.exec_driver_sql(f"DROP DATABASE IF EXISTS {database_name}")
