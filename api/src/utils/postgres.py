import contextlib
from uuid import UUID
from sqlalchemy import String, text
from collections.abc import Generator, AsyncGenerator
from longlink.storage import tls
from sqlalchemy.engine import URL
from sqlalchemy.schema import CreateSchema
from sqlalchemy.ext.asyncio import AsyncConnection, create_async_engine
from sqlalchemy.sql.elements import quoted_name


class Postgres:
    """Provision organization databases and Solution schemas using cluster-owned PostgreSQL credentials.

    Runtime roles can access only their own Solution schema.
    """

    def __init__(
        self,
        host: str,
        port: int,
        username: str,
        password: str,
        certificate: str | None = None,
        *,
        # Tunnels can override the socket address without changing TLS identity.
        hostaddr: str | None = None,
    ) -> None:
        """Configure organization SQL provisioning.

        Args:
            host: PostgreSQL host.
            port: PostgreSQL port.
            username: PostgreSQL username.
            password: PostgreSQL password.
            certificate: PEM CA certificate; when supplied, require certificate and hostname verification.
            hostaddr: Optional transport IP; host remains the PostgreSQL TLS identity.

        """

        # Configure the immutable cluster URL without acquiring certificate files or connections.
        query = {"sslmode": "verify-full" if certificate is not None else "disable", "options": "-c timezone=UTC"}

        # A tunnel changes only the transport address, preserving hostname verification.
        if hostaddr is not None:
            query["hostaddr"] = hostaddr

        # Keep connection details inside the adapter and credentials structured.
        self._url = URL.create("postgresql+psycopg", username=username, password=password, host=host, port=port, query=query)
        self._certificate = certificate

    @contextlib.contextmanager
    def url(self, database: str) -> Generator[URL]:
        """Yield a libpq URL whose CA file lives until exit; dispose all consuming engines inside this context."""

        # Derive operation-local settings without accumulating changes on the cluster URL.
        url = self._url.set(database=database)

        # Local connections need no certificate file; hosted connections must verify the server hostname and CA.
        if self._certificate is None:
            yield url
        else:
            with tls.certificate_file(self._certificate) as name:
                yield url.update_query_dict({"sslrootcert": name})

    @contextlib.asynccontextmanager
    async def connection(self, database: str, *, autocommit: bool = False) -> AsyncGenerator[AsyncConnection, None]:
        """Open one managed SQLAlchemy connection for a database.

        The provisioning utility owns the engine lifecycle and disposes it after every operation.
        """

        # Build a short-lived engine with autocommit only for PostgreSQL database lifecycle statements.
        with self.url(database) as url:
            engine = create_async_engine(url, hide_parameters=True, **({"isolation_level": "AUTOCOMMIT"} if autocommit else {}))

            # Use explicit connections for autocommit operations and transactions otherwise.
            try:
                async with engine.connect() if autocommit else engine.begin() as conn:
                    yield conn

            # Dispose the per-operation engine even when SQL execution raises.
            finally:
                await engine.dispose()

    async def usage(self, organization: UUID) -> int:
        """Measure all schemas and indexes in one Organization database without modifying it."""

        # Ask PostgreSQL for the current database's on-disk size through the managed connection.
        async with self.connection(organization.hex) as conn:
            result = await conn.execute(text("SELECT pg_database_size(current_database())"))
            return result.scalar_one()

    async def prepare_organization_database(self, organization: UUID) -> None:
        """Converge one Organization database and restrict its public schema.

        Repeated calls resume the same topology after partial provisioning.
        """

        # Create the organization database from the maintenance database when it is missing.
        async with self.connection("postgres", autocommit=True) as conn:

            # CREATE DATABASE needs an identifier quoted by SQLAlchemy's dialect preparer.
            if await conn.scalar(text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": organization.hex}) is None:
                quoted_database_name = conn.engine.sync_engine.dialect.identifier_preparer.quote(organization.hex)
                await conn.exec_driver_sql(f"CREATE DATABASE {quoted_database_name}")

        # Keep runtime roles from creating or modifying public tables.
        async with self.connection(organization.hex) as conn:
            await conn.execute(text("REVOKE CREATE ON SCHEMA public FROM PUBLIC"))
            await conn.execute(text("REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM PUBLIC"))

    async def solution_schema(self, organization: UUID, solution: UUID, password: str) -> str:
        """Converge one solution schema and runtime role, rotating to the supplied password on every retry.

        Grant access only to the Solution schema, then return the runtime username.
        """

        # Derive the solution-scoped role while the cluster-owned password remains stable across retries.
        runtime_username = f"longlink_{organization.hex[:16]}_{solution.hex[:16]}"

        # Create the solution schema and bind the runtime role inside the organization database.
        async with self.connection(organization.hex) as conn:
            quote = conn.engine.sync_engine.dialect.identifier_preparer.quote
            await conn.execute(CreateSchema(quoted_name(solution.hex, True), if_not_exists=True))

            # Create or rotate the solution login role before granting schema permissions.
            role_exists = await conn.scalar(text("SELECT 1 FROM pg_roles WHERE rolname = :role"), {"role": runtime_username})
            role = quote(runtime_username)

            # PostgreSQL password literals must be escaped by the active SQLAlchemy dialect.
            password_processor = String().literal_processor(conn.engine.sync_engine.dialect)
            password_literal = password_processor(password)

            # Create new roles and rotate existing roles with fresh credentials.
            verb = "CREATE" if role_exists is None else "ALTER"
            await conn.exec_driver_sql(f"{verb} ROLE {role} LOGIN PASSWORD {password_literal}")

            # Quote all identifiers before composing role and privilege statements.
            database = quote(organization.hex)
            schema = quote(solution.hex)

            # Solution roles can create and modify tables only in their own schema.
            await conn.exec_driver_sql(
                f"""
                GRANT CONNECT ON DATABASE {database} TO {role};
                GRANT USAGE, CREATE ON SCHEMA {schema} TO {role};
                GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA {schema} TO {role};
                GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA {schema} TO {role};
                ALTER ROLE {role} IN DATABASE {database} SET search_path = {schema};
                """
            )

        return runtime_username

    async def delete_solution_schema(self, organization: UUID, solution: UUID) -> None:
        """Delete a solution schema and its runtime role when present."""

        # Skip cleanup when the organization database was already removed.
        async with self.connection("postgres", autocommit=True) as conn:
            if await conn.scalar(text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": organization.hex}) is None:
                return

        runtime_username = f"longlink_{organization.hex[:16]}_{solution.hex[:16]}"

        # Remove the Solution's schema and global role atomically within its Organization database.
        async with self.connection(organization.hex) as conn:
            quote = conn.engine.sync_engine.dialect.identifier_preparer.quote
            schema = quote(solution.hex)
            role = quote(runtime_username)
            database = quote(organization.hex)

            # Remove every grant and setting assigned during Solution provisioning when its role exists.
            if await conn.scalar(text("SELECT 1 FROM pg_roles WHERE rolname = :role"), {"role": runtime_username}) is not None:
                await conn.exec_driver_sql(
                    f"""
                    REVOKE ALL PRIVILEGES ON DATABASE {database} FROM {role};
                    ALTER ROLE {role} IN DATABASE {database} RESET search_path;
                    """
                )
            await conn.exec_driver_sql(f"DROP SCHEMA IF EXISTS {schema} CASCADE")

            # PostgreSQL permits role deletion in the same transaction after removing its dependencies.
            await conn.exec_driver_sql(f"DROP ROLE IF EXISTS {role}")
