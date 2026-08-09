import contextlib
from uuid import UUID
from typing import TypedDict
from sqlalchemy import String, text
from sqlalchemy.exc import OperationalError
from collections.abc import AsyncGenerator
from longlink.shared import migrations as shared_migrations
from src.models.types import DatabaseSSLMode

MAINTENANCE_DATABASE = "postgres"
from sqlalchemy.engine import URL
from sqlalchemy.schema import CreateSchema
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncConnection, create_async_engine
from sqlalchemy.sql.elements import quoted_name


class DatabaseRuntimeConnection(TypedDict):
    """Describe least-privilege connection material injected into one Application runtime."""

    host: str
    port: int
    password: str
    sslmode: DatabaseSSLMode
    username: str
    database_name: str


class DatabaseUsage(TypedDict):
    """Describe physical usage for one database."""

    space_used: int
    table_count: int


class Postgres:
    """Implement the database tenant topology on PostgreSQL using registry credentials for control-plane provisioning.

    Runtime roles can write their application schema and read the organization's shared schema.
    """

    def __init__(self, host: str, port: int, username: str, password: str, sslmode: DatabaseSSLMode) -> None:
        """Initialize the PostgreSQL database adapter.

        Args:
            host: PostgreSQL host.
            port: PostgreSQL port.
            username: PostgreSQL username.
            password: PostgreSQL password.
            sslmode: PostgreSQL SSL mode.
        """

        # Store registry connection settings.
        self._host = host
        self._port = port
        self._username = username
        self._password = password
        self._sslmode = sslmode

    def url(self, database: str, search_path: str | None = None) -> URL:
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

        # Attach PostgreSQL driver options after URL creation so credentials stay structured.
        query = {"sslmode": self._sslmode.value, "options": "-c timezone=UTC"}

        # Forward an explicit schema search path when callers request one.
        if search_path is not None:
            query["options"] = f"{query['options']} -c search_path={search_path}"

        return url.update_query_dict(query)

    def quote(self, conn: AsyncConnection, value: str) -> str:
        """Return a SQLAlchemy dialect-quoted SQL identifier."""

        return conn.engine.sync_engine.dialect.identifier_preparer.quote(value)

    def shared_schema_url(self, organization: UUID) -> str:
        """Return the control-plane shared-schema URL for one organization database."""

        # The URL embeds search_path so API orchestration can use unqualified shared table names.
        return self.url(organization.hex, search_path="shared").render_as_string(hide_password=False)

    @contextlib.asynccontextmanager
    async def _connection(
        self,
        database: str,
        *,
        autocommit: bool = False,
        search_path: str | None = None,
    ) -> AsyncGenerator[AsyncConnection, None]:
        """Open one managed SQLAlchemy connection for a database.

        The adapter owns the engine lifecycle and disposes it after every operation.
        """

        # Build a short-lived engine with autocommit only for PostgreSQL database lifecycle statements.
        engine: AsyncEngine = create_async_engine(
            self.url(database, search_path=search_path),
            pool_pre_ping=True,
            **({"isolation_level": "AUTOCOMMIT"} if autocommit else {}),
        )

        # Ensure the operation-scoped engine is disposed after use.
        try:
            # Use explicit connections for autocommit operations and transactions for normal operations.
            connection_context = engine.connect() if autocommit else engine.begin()

            # Yield the selected connection context to the caller.
            async with connection_context as conn:
                yield conn

        # Dispose the per-operation engine even when SQL execution raises.
        finally:
            await engine.dispose()

    async def prepare_organization_database(self, organization: UUID) -> None:
        """Converge one organization database, run SDK-owned shared-schema migrations, and restore shared-schema restrictions.

        Repeated calls resume the same topology after partial provisioning.
        """

        # Create the organization database from the maintenance database when it is missing.
        async with self._connection(MAINTENANCE_DATABASE, autocommit=True) as conn:
            # Create the database only when PostgreSQL does not already list it.
            if (
                await conn.execute(text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": organization.hex})
            ).scalar_one_or_none() is None:
                # CREATE DATABASE needs a quoted identifier, so compile it with SQLAlchemy's dialect preparer.
                quoted_database_name = self.quote(conn, organization.hex)
                await conn.exec_driver_sql(f"CREATE DATABASE {quoted_database_name}")

        # SDK migrations create the organization schema before users or application schemas rely on it.
        await shared_migrations.migrate_database(self.shared_schema_url(organization))

        # Re-apply shared schema restrictions because migrations can recreate schema-owned objects.
        async with self._connection(organization.hex) as conn:
            shared_schema = self.quote(conn, "shared")
            await conn.execute(text("REVOKE CREATE ON SCHEMA public FROM PUBLIC"))
            await conn.exec_driver_sql(f"REVOKE CREATE ON SCHEMA {shared_schema} FROM PUBLIC")
            await conn.execute(text("REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM PUBLIC"))
            await conn.exec_driver_sql(f"REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA {shared_schema} FROM PUBLIC")

    async def schema(self, organization: UUID, application: UUID, password: str) -> DatabaseRuntimeConnection:
        """Converge one application schema and runtime role, rotating to the supplied password on every retry.

        Grant writes only to the application schema and reads to shared tables, then return non-administrator connection material.
        """

        # Derive the app-scoped role while the cluster-owned password remains stable across retries.
        runtime_username = f"longlink_{organization.hex[:16]}_{application.hex[:16]}"

        # Create the app schema and bind the runtime role inside the organization database.
        async with self._connection(organization.hex) as conn:
            await conn.execute(CreateSchema(quoted_name(application.hex, True), if_not_exists=True))

            # Create or rotate the app login role before granting schema permissions.
            result = await conn.execute(text("SELECT 1 FROM pg_roles WHERE rolname = :role"), {"role": runtime_username})
            role = self.quote(conn, runtime_username)

            # PostgreSQL password literals must be escaped by the active SQLAlchemy dialect.
            password_processor = String().literal_processor(conn.engine.sync_engine.dialect)
            if password_processor is None:
                raise ValueError("PostgreSQL string literal processing is unavailable")

            password_literal = password_processor(password)

            # Create new roles and rotate existing roles with fresh credentials.
            if result.scalar_one_or_none() is None:
                await conn.exec_driver_sql(f"CREATE ROLE {role} LOGIN PASSWORD {password_literal}")

            # Rotate credentials for existing runtime roles.
            else:
                await conn.exec_driver_sql(f"ALTER ROLE {role} LOGIN PASSWORD {password_literal}")

            # Quote all identifiers before composing role and privilege statements.
            database = self.quote(conn, organization.hex)
            schema = self.quote(conn, application.hex)
            shared_schema = self.quote(conn, "shared")

            # App roles write to their own schema and read organization shared tables.
            await conn.exec_driver_sql(
                f"""
                GRANT CONNECT ON DATABASE {database} TO {role};
                GRANT USAGE, CREATE ON SCHEMA {schema} TO {role};
                GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA {schema} TO {role};
                GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA {schema} TO {role};
                GRANT USAGE ON SCHEMA {shared_schema} TO {role};
                REVOKE CREATE ON SCHEMA {shared_schema} FROM {role};
                REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA {shared_schema} FROM {role};
                GRANT SELECT, REFERENCES ON ALL TABLES IN SCHEMA {shared_schema} TO {role};
                ALTER DEFAULT PRIVILEGES IN SCHEMA {shared_schema} GRANT SELECT, REFERENCES ON TABLES TO {role};
                ALTER ROLE {role} IN DATABASE {database} SET search_path = {schema}, {shared_schema};
                """
            )

        # Return runtime credentials without exposing the registry administrator password.
        return {
            "host": self._host,
            "port": self._port,
            "password": password,
            "sslmode": self._sslmode,
            "username": runtime_username,
            "database_name": organization.hex,
        }

    async def delete_schema(self, organization: UUID, application: UUID) -> None:
        """Delete an application schema and its runtime role when present."""

        # Skip cleanup when the organization database was already removed.
        async with self._connection(MAINTENANCE_DATABASE, autocommit=True) as conn:
            # Stop once PostgreSQL confirms the organization database is absent.
            result = await conn.execute(text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": organization.hex})
            if result.scalar_one_or_none() is None:
                return

        runtime_username = f"longlink_{organization.hex[:16]}_{application.hex[:16]}"

        # Drop app-owned objects before dropping the global role from the maintenance database.
        async with self._connection(organization.hex) as conn:
            schema = self.quote(conn, application.hex)
            role = self.quote(conn, runtime_username)
            database = self.quote(conn, organization.hex)
            shared_schema = self.quote(conn, "shared")

            # Remove every grant and setting assigned during Application provisioning before dropping its role.
            await conn.exec_driver_sql(
                f"""
                REVOKE ALL PRIVILEGES ON DATABASE {database} FROM {role};
                REVOKE ALL PRIVILEGES ON SCHEMA {shared_schema} FROM {role};
                REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA {shared_schema} FROM {role};
                ALTER DEFAULT PRIVILEGES IN SCHEMA {shared_schema} REVOKE ALL ON TABLES FROM {role};
                ALTER ROLE {role} IN DATABASE {database} RESET search_path;
                """
            )
            await conn.exec_driver_sql(f"DROP SCHEMA IF EXISTS {schema} CASCADE")

        # Roles are cluster-global, so drop them from the maintenance database with autocommit.
        async with self._connection(MAINTENANCE_DATABASE, autocommit=True) as conn:
            role = self.quote(conn, runtime_username)
            await conn.exec_driver_sql(f"DROP ROLE IF EXISTS {role}")

    async def delete_database(self, organization: UUID) -> None:
        """Delete one organization database and tolerate missing databases."""

        # Terminate active sessions so PostgreSQL can drop the organization database.
        async with self._connection(MAINTENANCE_DATABASE, autocommit=True) as conn:
            database_name = self.quote(conn, organization.hex)
            await conn.execute(
                text(
                    """
                    SELECT pg_terminate_backend(pid)
                    FROM pg_stat_activity
                    WHERE datname = :database_name
                    AND pid <> pg_backend_pid()
                    """
                ),
                {"database_name": organization.hex},
            )

            # DROP DATABASE must run outside a transaction, so this uses the autocommit connection above.
            await conn.exec_driver_sql(f"DROP DATABASE IF EXISTS {database_name}")

    async def application_runtime_identity_exists(self, organization: UUID, application: UUID) -> bool:
        """Return whether one Application runtime database identity remains in PostgreSQL."""

        # Runtime roles are cluster-global and remain discoverable after their database is removed.
        runtime_username = f"longlink_{organization.hex[:16]}_{application.hex[:16]}"
        async with self._connection(MAINTENANCE_DATABASE) as conn:
            result = await conn.execute(text("SELECT 1 FROM pg_roles WHERE rolname = :role"), {"role": runtime_username})
            return result.scalar_one_or_none() is not None

    async def database_usage(self, database_name: str) -> DatabaseUsage | None:
        """Return physical size and user table count for one database when it exists."""

        # Read both metrics from the exact Organization database and normalize an absent database to no usage.
        try:
            async with self._connection(database_name) as conn:
                result = await conn.execute(
                    text(
                        """
                        SELECT
                            pg_database_size(current_database()) AS space_used,
                            (
                                SELECT COUNT(c.oid)
                                FROM pg_namespace n
                                JOIN pg_class c ON c.relnamespace = n.oid
                                WHERE n.nspname != 'information_schema'
                                AND n.nspname !~ '^pg_'
                                AND c.relkind IN ('r', 'p')
                            ) AS table_count
                        """
                    )
                )
        except OperationalError:
            # Distinguish an unprovisioned database from connectivity and permission failures.
            async with self._connection(MAINTENANCE_DATABASE) as conn:
                database_exists = await conn.scalar(
                    text("SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = :database_name)"),
                    {"database_name": database_name},
                )
            if not database_exists:
                return None
            raise

        usage = result.mappings().one()
        return {"space_used": int(usage["space_used"]), "table_count": int(usage["table_count"])}

    async def usage(self) -> int:
        """Return the total non-system database size in bytes."""

        # Sum all non-system databases managed by this PostgreSQL backend.
        async with self._connection(MAINTENANCE_DATABASE) as conn:
            result = await conn.execute(
                text(
                    """
                    SELECT COALESCE(SUM(pg_database_size(datname)), 0) AS database_size
                    FROM pg_database
                    WHERE datname NOT IN ('postgres', 'template0', 'template1')
                    """
                )
            )

            # Normalize the scalar result to the API response value.
            database_size = result.scalar_one()
            return int(database_size)
