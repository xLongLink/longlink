import asyncio
from alembic import context
from sqlalchemy import pool, text
from longlink.database import urls
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

config = context.config


def run_migrations_offline() -> None:
    """Run shared-schema migrations in offline mode."""

    # Configure SQL generation without opening a database connection.
    database_url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=database_url,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        version_table_schema="shared",
    )

    # Emit the schema bootstrap and scope unqualified shared tables to it.
    with context.begin_transaction():
        context.execute("CREATE SCHEMA IF NOT EXISTS shared")
        context.execute("SET search_path TO shared")
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Run shared-schema migrations on one synchronous connection."""

    # Alembic creates its version table before revisions, so create the schema first.
    connection.execute(text("CREATE SCHEMA IF NOT EXISTS shared"))
    connection.execute(text("SET search_path TO shared"))
    connection.commit()
    context.configure(connection=connection, version_table_schema="shared")

    # Keep Alembic in charge of the migration transaction.
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations(database_url: str) -> None:
    """Run shared-schema migrations through an async SQLAlchemy engine."""

    # Use an operation-scoped pool because each organization has its own database.
    connectable = create_async_engine(
        database_url,
        poolclass=pool.NullPool,
        connect_args=urls.connect_args(database_url),
    )
    try:
        async with connectable.connect() as connection:
            await connection.run_sync(do_run_migrations)
    finally:
        await connectable.dispose()


# Select migration execution from the active Alembic context.
if context.is_offline_mode():
    run_migrations_offline()
else:
    # Require the organization database URL supplied by the control-plane migration runner.
    database_url = config.get_main_option("sqlalchemy.url")
    if database_url is None:
        raise RuntimeError("Alembic sqlalchemy.url is not configured")

    asyncio.run(run_async_migrations(database_url))
