import tempfile
import contextlib
from uuid import UUID
from sqlalchemy import String, text
from collections.abc import Iterator, AsyncGenerator
from longlink.shared import migrations as shared_migrations
from src.models.types import DatabaseSSLMode
from sqlalchemy.engine import URL
from sqlalchemy.schema import CreateSchema
from sqlalchemy.ext.asyncio import AsyncConnection, create_async_engine
from sqlalchemy.sql.elements import quoted_name


class Postgres:
    """Provision organization databases and Solution schemas using cluster-owned PostgreSQL credentials.

    Runtime roles can write their solution schema and read the organization's shared schema.
    """

    def __init__(
        self,
        host: str,
        port: int,
        username: str,
        password: str,
        sslmode: DatabaseSSLMode,
        certificate: str | None = None,
        *,
        hostaddr: str | None = None,
    ) -> None:
        """Configure organization SQL provisioning.

        Args:
            host: PostgreSQL host.
            port: PostgreSQL port.
            username: PostgreSQL username.
            password: PostgreSQL password.
            sslmode: PostgreSQL SSL mode.
            certificate: PEM CA certificate; when supplied, require certificate and hostname verification.
            hostaddr: Optional transport IP; host remains the PostgreSQL TLS identity.
        """

        # Store organization cluster connection settings.
        self._host = host
        self._port = port
        self._hostaddr = hostaddr
        self._username = username
        self._password = password
        self._sslmode = sslmode
        self._certificate = certificate

    @contextlib.contextmanager
    def url(self, database: str, search_path: str | None = None) -> Iterator[URL]:
        """Yield a libpq URL whose CA file lives until exit; dispose all consuming engines inside this context."""

        # Configure PostgreSQL driver options before creating the structured URL.
        sslmode = "verify-full" if self._certificate is not None else self._sslmode.value
        query = {"sslmode": sslmode, "options": "-c timezone=UTC"}

        # A tunnel changes only the transport address, preserving hostname verification.
        if self._hostaddr is not None:
            query["hostaddr"] = self._hostaddr

        # Forward an explicit schema search path when callers request one.
        if search_path is not None:
            query["options"] = f"{query['options']} -c search_path={search_path}"

        # Keep connection details inside the adapter and credentials structured.
        url = URL.create(
            "postgresql+psycopg",
            username=self._username,
            password=self._password,
            host=self._host,
            port=self._port,
            database=database,
            query=query,
        )

        # Local connections need no certificate file; hosted connections must verify the server hostname and CA.
        if self._certificate is None:
            yield url
        else:
            with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", suffix=".crt") as certificate:
                certificate.write(self._certificate)
                certificate.flush()
                yield url.update_query_dict({"sslrootcert": certificate.name})

    @staticmethod
    def quote(conn: AsyncConnection, value: str) -> str:
        """Return a SQLAlchemy dialect-quoted SQL identifier."""

        return conn.engine.sync_engine.dialect.identifier_preparer.quote(value)

    @contextlib.asynccontextmanager
    async def _connection(
        self,
        database: str,
        *,
        autocommit: bool = False,
        search_path: str | None = None,
    ) -> AsyncGenerator[AsyncConnection, None]:
        """Open one managed SQLAlchemy connection for a database.

        The provisioning utility owns the engine lifecycle and disposes it after every operation.
        """

        # Build a short-lived engine with autocommit only for PostgreSQL database lifecycle statements.
        with self.url(database, search_path=search_path) as url:
            engine = create_async_engine(
                url,
                **({"isolation_level": "AUTOCOMMIT"} if autocommit else {}),
            )

            # Ensure the operation-scoped engine is disposed before removing its CA file.
            try:
                # Use explicit connections for autocommit operations and transactions for normal operations.
                async with engine.connect() if autocommit else engine.begin() as conn:
                    yield conn

            # Dispose the per-operation engine even when SQL execution raises.
            finally:
                await engine.dispose()

    async def prepare_organization_database(self, organization: UUID) -> None:
        """Converge one organization database, run SDK-owned shared-schema migrations, and restore shared-schema restrictions.

        Repeated calls resume the same topology after partial provisioning.
        """

        # Create the organization database from the maintenance database when it is missing.
        async with self._connection("postgres", autocommit=True) as conn:
            # Create the database only when PostgreSQL does not already list it.
            if await conn.scalar(text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": organization.hex}) is None:
                # CREATE DATABASE needs a quoted identifier, so compile it with SQLAlchemy's dialect preparer.
                quoted_database_name = self.quote(conn, organization.hex)
                await conn.exec_driver_sql(f"CREATE DATABASE {quoted_database_name}")

        # SDK migrations create the organization schema before users or solution schemas rely on it.
        with self.url(organization.hex) as url:
            await shared_migrations.migrate_database(url)

        # Re-apply shared schema restrictions because migrations can recreate schema-owned objects.
        async with self._connection(organization.hex) as conn:
            shared_schema = self.quote(conn, "shared")
            await conn.execute(text("REVOKE CREATE ON SCHEMA public FROM PUBLIC"))
            await conn.exec_driver_sql(f"REVOKE CREATE ON SCHEMA {shared_schema} FROM PUBLIC")
            await conn.execute(text("REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM PUBLIC"))
            await conn.exec_driver_sql(f"REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA {shared_schema} FROM PUBLIC")

    async def solution_schema(self, organization: UUID, solution: UUID, password: str) -> str:
        """Converge one solution schema and runtime role, rotating to the supplied password on every retry.

        Grant writes only to the solution schema and reads to shared tables, then return the runtime username.
        """

        # Derive the solution-scoped role while the cluster-owned password remains stable across retries.
        runtime_username = f"longlink_{organization.hex[:16]}_{solution.hex[:16]}"

        # Create the solution schema and bind the runtime role inside the organization database.
        async with self._connection(organization.hex) as conn:
            await conn.execute(CreateSchema(quoted_name(solution.hex, True), if_not_exists=True))

            # Create or rotate the solution login role before granting schema permissions.
            role_exists = await conn.scalar(text("SELECT 1 FROM pg_roles WHERE rolname = :role"), {"role": runtime_username})
            role = self.quote(conn, runtime_username)

            # PostgreSQL password literals must be escaped by the active SQLAlchemy dialect.
            password_processor = String().literal_processor(conn.engine.sync_engine.dialect)
            if password_processor is None:
                raise ValueError("PostgreSQL string literal processing is unavailable")

            password_literal = password_processor(password)

            # Create new roles and rotate existing roles with fresh credentials.
            verb = "CREATE" if role_exists is None else "ALTER"
            await conn.exec_driver_sql(f"{verb} ROLE {role} LOGIN PASSWORD {password_literal}")

            # Quote all identifiers before composing role and privilege statements.
            database = self.quote(conn, organization.hex)
            schema = self.quote(conn, solution.hex)
            shared_schema = self.quote(conn, "shared")

            # Solution roles write to their own schema and read organization shared tables.
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

        return runtime_username

    async def delete_solution_schema(self, organization: UUID, solution: UUID) -> None:
        """Delete a solution schema and its runtime role when present."""

        # Skip cleanup when the organization database was already removed.
        async with self._connection("postgres", autocommit=True) as conn:
            # Stop once PostgreSQL confirms the organization database is absent.
            if await conn.scalar(text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": organization.hex}) is None:
                return

        runtime_username = f"longlink_{organization.hex[:16]}_{solution.hex[:16]}"

        # Drop solution-owned objects before dropping the global role from the maintenance database.
        async with self._connection(organization.hex) as conn:
            schema = self.quote(conn, solution.hex)
            role = self.quote(conn, runtime_username)
            database = self.quote(conn, organization.hex)
            shared_schema = self.quote(conn, "shared")

            # Remove every grant and setting assigned during Solution provisioning when its role exists.
            if await conn.scalar(text("SELECT 1 FROM pg_roles WHERE rolname = :role"), {"role": runtime_username}) is not None:
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
        async with self._connection("postgres", autocommit=True) as conn:
            role = self.quote(conn, runtime_username)
            await conn.exec_driver_sql(f"DROP ROLE IF EXISTS {role}")

    async def database_usage(self, database_name: str) -> int | None:
        """Return physical size for one database when it exists."""

        # Query through the maintenance database so only a missing catalog row means absence.
        async with self._connection("postgres") as conn:
            usage = await conn.scalar(
                text("SELECT pg_database_size(datname) FROM pg_database WHERE datname = :database_name"),
                {"database_name": database_name},
            )
        return int(usage) if usage is not None else None
