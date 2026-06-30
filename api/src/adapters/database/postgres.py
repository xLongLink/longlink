import secrets
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from .base import Database, DatabaseCellValue, DatabaseSchemaUsage, DatabaseTableData, DatabaseTableUsage
from hashlib import sha1
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from sqlalchemy import text
from src.environments import env
from sqlalchemy.engine import URL
from sqlalchemy.schema import DropSchema, CreateSchema
from src.utils.namespace import dbname
from sqlalchemy.ext.asyncio import (AsyncEngine, AsyncConnection,
                                    create_async_engine)
from sqlalchemy.sql.elements import quoted_name


class Postgres(Database):
    """PostgreSQL database adapter."""

    def __init__(
        self,
        host: str,
        port: int,
        username: str,
        password: str,
        runtime_host: str | None = None,
        runtime_port: int | None = None,
    ) -> None:
        """Initialize the PostgreSQL database adapter.

        Args:
            host: PostgreSQL host.
            port: PostgreSQL port.
            username: PostgreSQL username.
            password: PostgreSQL password.
            runtime_host: PostgreSQL host reachable from application runtimes.
            runtime_port: PostgreSQL port reachable from application runtimes.
        """
        self._host = host
        self._port = port
        self._username = username
        self._password = password
        self._runtime_host = runtime_host or host
        self._runtime_port = runtime_port if runtime_port is not None else port
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


    def _runtime_url(self, database: str, username: str, password: str) -> URL:
        """Build one SQLAlchemy URL for an application runtime role."""

        url = URL.create(
            "postgresql+psycopg",
            username=username,
            password=password,
            host=self._runtime_host,
            port=self._runtime_port,
            database=database,
        )
        return url.update_query_dict({"sslmode": self._sslmode})


    def _application_role(self, organization: str, application: str) -> str:
        """Return the PostgreSQL login role for one application runtime."""

        role = f"longlink_{organization}_{application}"
        if len(role) <= 63:
            return role

        digest = sha1(role.encode("utf-8")).hexdigest()[:12]
        return f"{role[:50]}_{digest}"


    def _cell_value(self, value: object) -> DatabaseCellValue:
        """Convert database values into JSON-safe preview cell values."""

        if value is None or isinstance(value, str | int | float | bool):
            return value

        if isinstance(value, Decimal):
            return float(value)

        if isinstance(value, date | datetime | UUID):
            return str(value)

        return str(value)


    @asynccontextmanager
    async def _connection(self, database: str, *, autocommit: bool = False) -> AsyncIterator[AsyncConnection]:
        """Open one managed SQLAlchemy connection for a database.

        The adapter owns the engine lifecycle and disposes it after every operation.
        """

        engine_kwargs: dict[str, object] = {"pool_pre_ping": True}
        if autocommit:
            engine_kwargs["isolation_level"] = "AUTOCOMMIT"

        engine: AsyncEngine = create_async_engine(self._url(database), **engine_kwargs)
        try:
            if autocommit:
                async with engine.connect() as conn:
                    yield conn
            else:
                async with engine.begin() as conn:
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


    async def _ensure_shared_users_table(self, conn: AsyncConnection) -> None:
        """Create the shared organization users table when it is missing."""

        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS public.users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(254) NOT NULL,
                name VARCHAR(255) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))


    async def _restrict_shared_users_table(self, conn: AsyncConnection) -> None:
        """Restrict default write access to the shared organization users table."""

        await conn.execute(text("REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.users FROM PUBLIC"))


    async def _ensure_application_role(self, conn: AsyncConnection, role_name: str, password: str) -> None:
        """Create or update the runtime login role for one application."""

        result = await conn.execute(text("SELECT 1 FROM pg_roles WHERE rolname = :role"), {"role": role_name})
        role = conn.engine.sync_engine.dialect.identifier_preparer.quote(role_name)
        escaped_password = password.replace("'", "''")
        password_literal = f"'{escaped_password}'"
        if result.scalar_one_or_none() is None:
            await conn.exec_driver_sql(f"CREATE ROLE {role} LOGIN PASSWORD {password_literal}")
            return

        await conn.exec_driver_sql(f"ALTER ROLE {role} LOGIN PASSWORD {password_literal}")


    async def _grant_application_permissions(
        self,
        conn: AsyncConnection,
        database_name: str,
        application: str,
        role_name: str,
    ) -> None:
        """Grant one application role write access to its schema and read access to public users."""

        preparer = conn.engine.sync_engine.dialect.identifier_preparer
        database = preparer.quote(database_name)
        schema = preparer.quote(application)
        role = preparer.quote(role_name)

        await conn.exec_driver_sql(f"GRANT CONNECT ON DATABASE {database} TO {role}")
        await conn.exec_driver_sql(f"GRANT USAGE, CREATE ON SCHEMA {schema} TO {role}")
        await conn.exec_driver_sql(f"GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA {schema} TO {role}")
        await conn.exec_driver_sql(f"GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA {schema} TO {role}")
        await conn.exec_driver_sql(f"GRANT USAGE ON SCHEMA public TO {role}")
        await conn.exec_driver_sql(f"REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.users FROM {role}")
        await conn.exec_driver_sql(f"GRANT SELECT, REFERENCES ON TABLE public.users TO {role}")


    async def database(self, organization: str) -> str:
        """Create the organization database if it does not exist and return a connection DSN."""
        await self._ensure_organization_database(organization)
        database_name = dbname(organization)

        async with self._connection(database_name) as conn:
            await self._ensure_shared_users_table(conn)
            await self._restrict_shared_users_table(conn)

        return self._url(database_name).render_as_string(hide_password=False)


    async def schema(self, organization: str, application: str) -> str:
        """Create or replace the schema for one application and return a connection DSN."""
        await self._ensure_organization_database(organization)
        database_name = dbname(organization)
        role_name = self._application_role(organization, application)
        role_password = secrets.token_urlsafe(24)

        async with self._connection(database_name) as conn:
            await conn.execute(CreateSchema(quoted_name(application, True), if_not_exists=True))
            await self._ensure_shared_users_table(conn)
            await self._restrict_shared_users_table(conn)
            await self._ensure_application_role(conn, role_name, role_password)
            await self._grant_application_permissions(conn, database_name, application, role_name)

        return self._runtime_url(database_name, role_name, role_password).render_as_string(hide_password=False)


    async def remove(self, organization: str, application: str) -> None:
        """Remove one application schema from the organization database."""

        async with self._connection(dbname(organization)) as conn:
            await conn.execute(DropSchema(quoted_name(application, True), cascade=True, if_exists=True))
            role = conn.engine.sync_engine.dialect.identifier_preparer.quote(self._application_role(organization, application))
            await conn.exec_driver_sql(f"DROP ROLE IF EXISTS {role}")


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


    async def schema_usage(self, database_name: str) -> list[DatabaseSchemaUsage]:
        """Return usage details for application schemas in a database."""

        async with self._connection(database_name) as conn:
            result = await conn.execute(
                text(
                    """
                    SELECT
                        n.nspname AS name,
                        COALESCE(SUM(CASE WHEN c.relkind IN ('r', 'p', 'm') THEN pg_total_relation_size(c.oid) ELSE 0 END), 0) AS space_used,
                        COUNT(c.oid) FILTER (WHERE c.relkind IN ('r', 'p', 'm')) AS table_count,
                        COALESCE(SUM(CASE WHEN c.relkind IN ('r', 'p', 'm') THEN GREATEST(c.reltuples, 0) ELSE 0 END), 0) AS row_estimate
                    FROM pg_namespace n
                    LEFT JOIN pg_class c ON c.relnamespace = n.oid
                    WHERE n.nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'public')
                    AND n.nspname NOT LIKE 'pg_%'
                    GROUP BY n.nspname
                    ORDER BY n.nspname
                    """
                )
            )
            return [
                {
                    "name": row["name"],
                    "space_used": int(row["space_used"]),
                    "table_count": int(row["table_count"]),
                    "row_estimate": int(row["row_estimate"]),
                }
                for row in result.mappings().all()
            ]


    async def table_usage(self, database_name: str, schema_name: str, table_name: str) -> DatabaseTableUsage | None:
        """Return usage details for one table in a database."""

        async with self._connection(database_name) as conn:
            result = await conn.execute(
                text(
                    """
                    SELECT
                        c.relname AS name,
                        pg_total_relation_size(c.oid) AS space_used,
                        GREATEST(c.reltuples, 0) AS row_estimate
                    FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = :schema_name
                    AND c.relname = :table_name
                    AND c.relkind IN ('r', 'p', 'm')
                    """
                ),
                {"schema_name": schema_name, "table_name": table_name},
            )
            row = result.mappings().one_or_none()
            if row is None:
                return None

            return {
                "name": row["name"],
                "space_used": int(row["space_used"]),
                "row_estimate": int(row["row_estimate"]),
            }


    async def _table_names(self, conn: AsyncConnection, schema_name: str) -> list[str]:
        """Return queryable table names for one schema."""

        result = await conn.execute(
            text(
                """
                SELECT c.relname AS name
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = :schema_name
                AND c.relkind IN ('r', 'p', 'm')
                ORDER BY c.relname
                """
            ),
            {"schema_name": schema_name},
        )
        return [row[0] for row in result.fetchall()]


    async def _table_data(
        self,
        conn: AsyncConnection,
        schema_name: str,
        table_name: str,
        limit: int,
    ) -> DatabaseTableData:
        """Return columns and preview rows for one table."""

        columns_result = await conn.execute(
            text(
                """
                SELECT column_name, data_type, is_nullable, ordinal_position
                FROM information_schema.columns
                WHERE table_schema = :schema_name
                AND table_name = :table_name
                ORDER BY ordinal_position
                """
            ),
            {"schema_name": schema_name, "table_name": table_name},
        )
        columns = [
            {
                "name": row["column_name"],
                "type": row["data_type"],
                "nullable": row["is_nullable"] == "YES",
                "position": int(row["ordinal_position"]),
            }
            for row in columns_result.mappings().all()
        ]

        preparer = conn.engine.sync_engine.dialect.identifier_preparer
        schema = preparer.quote(schema_name)
        table = preparer.quote(table_name)
        rows_result = await conn.execute(text(f"SELECT * FROM {schema}.{table} LIMIT :limit"), {"limit": limit})
        rows = [
            {key: self._cell_value(value) for key, value in row.items()}
            for row in rows_result.mappings().all()
        ]

        return {
            "name": table_name,
            "schema_name": schema_name,
            "columns": columns,
            "rows": rows,
        }


    async def tables(self, database_name: str, schema_name: str, *, limit: int = 100) -> list[DatabaseTableData]:
        """Return tables, columns, and preview rows for one schema."""

        async with self._connection(database_name) as conn:
            names = await self._table_names(conn, schema_name)
            return [await self._table_data(conn, schema_name, name, limit) for name in names]


    async def table(self, database_name: str, schema_name: str, table_name: str, *, limit: int = 100) -> DatabaseTableData | None:
        """Return columns and preview rows for one table."""

        async with self._connection(database_name) as conn:
            if table_name not in await self._table_names(conn, schema_name):
                return None

            return await self._table_data(conn, schema_name, table_name, limit)


    async def usage(self) -> dict[str, int]:
        """Return the total non-system database size in bytes."""

        async with self._connection(self._maintenance_database) as conn:
            result = await conn.execute(
                text(
                    """
                    SELECT COALESCE(SUM(pg_database_size(datname)), 0) AS database_size
                    FROM pg_database
                    WHERE datname NOT IN ('postgres', 'template0', 'template1')
                    """
                )
            )
            database_size = result.scalar_one()
            return {"space_used": int(database_size)}


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
