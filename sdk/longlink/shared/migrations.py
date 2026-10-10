from alembic import command
from contextlib import asynccontextmanager
from sqlalchemy import pool
from alembic.config import Config
from collections.abc import AsyncIterator
from longlink.database import urls
from sqlalchemy.engine import URL, Connection, make_url
from importlib.resources import files
from sqlalchemy.ext.asyncio import AsyncConnection, create_async_engine


def migration_config(database_url: str | URL) -> Config:
    """Build organization migration config; online execution requires a supplied connection.

    Use ``migrate_database()`` to own the online connection and its cleanup.
    """

    # Normalize structured and string URLs before validating the database driver.
    url = make_url(database_url)
    if url.drivername not in {"postgresql+asyncpg", "postgresql+psycopg"}:
        raise ValueError("Shared migrations require an async PostgreSQL database URL")

    # Shared migrations ship with the SDK package that defines the shared contract.
    packaged_location = files("longlink.shared").joinpath("alembic")
    if not packaged_location.joinpath("env.py").is_file() or not packaged_location.joinpath("versions").is_dir():
        raise RuntimeError("LongLink shared-schema Alembic migrations could not be located")

    config = Config()
    config.set_main_option("script_location", str(packaged_location))

    # Alembic uses ConfigParser, where percent-encoded URL characters must be escaped.
    config.set_main_option("sqlalchemy.url", url.render_as_string(hide_password=False).replace("%", "%%"))

    # Configure driver session settings without altering the caller-owned URL connection contract.
    config.attributes["connect_args"] = urls.connect_args(url)
    return config


@asynccontextmanager
async def migration_connection(database_url: str | URL, connect_args: dict[str, object]) -> AsyncIterator[AsyncConnection]:
    """Own one shared-migration connection and dispose its engine before returning."""

    # Use an operation-scoped pool because each organization has its own database.
    engine = create_async_engine(
        database_url,
        poolclass=pool.NullPool,
        connect_args=connect_args,
        hide_parameters=True,
    )

    # Close the connection before disposing the engine, including on failure or cancellation.
    try:
        async with engine.connect() as connection:
            yield connection
    finally:
        await engine.dispose()


async def migrate_database(database_url: str | URL) -> None:
    """Apply shared-schema migrations on the caller's event loop."""

    # Validate the URL and configure the packaged shared revisions before opening a connection.
    config = migration_config(database_url)

    def upgrade(connection: Connection) -> None:
        """Let Alembic use the synchronous view of the caller-owned connection."""

        # Keep Alembic on the supplied connection instead of starting another event loop.
        config.attributes["connection"] = connection
        command.upgrade(config, "head")

    # Await migration execution and cleanup before the caller releases its certificate or tunnel.
    async with migration_connection(database_url, config.attributes["connect_args"]) as connection:
        await connection.run_sync(upgrade)
