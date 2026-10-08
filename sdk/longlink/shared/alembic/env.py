import asyncio
from alembic import context
from sqlalchemy import text
from longlink.shared import migrations
from sqlalchemy.engine import Connection

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

    # Alembic creates its version table before revisions, so configure the target schema first.
    context.configure(connection=connection, version_table_schema="shared")

    # Bootstrap the schema and apply revisions in one transaction.
    with context.begin_transaction():
        connection.execute(text("CREATE SCHEMA IF NOT EXISTS shared"))
        connection.execute(text("SET search_path TO shared"))
        context.run_migrations()


async def run_async_migrations(database_url: str) -> None:
    """Open a managed connection for a standalone online Alembic command."""

    # Reuse the SDK connection lifecycle without issuing another Alembic command.
    async with migrations.migration_connection(database_url, config.attributes["connect_args"]) as connection:
        await connection.run_sync(do_run_migrations)


# Select migration execution from the active Alembic context.
if context.is_offline_mode():
    run_migrations_offline()
else:
    # The async SDK runner supplies the synchronous view of its own connection.
    connection = config.attributes.get("connection")
    if connection is not None:
        if not isinstance(connection, Connection):
            raise TypeError("Alembic connection must be a SQLAlchemy Connection")
        do_run_migrations(connection)
    else:
        # Standalone commands still open their own connection on a new event loop.
        database_url = config.get_main_option("sqlalchemy.url")
        if database_url is None:
            raise RuntimeError("Alembic sqlalchemy.url is not configured")

        asyncio.run(run_async_migrations(database_url))
