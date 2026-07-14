import asyncio
from typing import Any
from alembic import context
from sqlalchemy import pool, text, engine_from_config
from sqlalchemy.engine import Connection, make_url
from longlink.shared.models import shared_metadata
from sqlalchemy.ext.asyncio import create_async_engine
from longlink.shared.constants import SHARED_SCHEMA

config = context.config
target_metadata = shared_metadata


def context_options() -> dict[str, Any]:
    """Return Alembic options for SDK-owned shared-schema migrations."""

    return {
        "target_metadata": target_metadata,
        "compare_type": True,
        "version_table_schema": SHARED_SCHEMA,
    }


def run_migrations_offline() -> None:
    """Run shared-schema migrations in offline mode."""

    # Configure SQL generation without opening a database connection.
    database_url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=database_url,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        **context_options(),
    )

    # Emit the schema bootstrap and scope unqualified shared tables to it.
    with context.begin_transaction():
        context.execute(f"CREATE SCHEMA IF NOT EXISTS {SHARED_SCHEMA}")
        context.execute(f"SET search_path TO {SHARED_SCHEMA}")
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Run shared-schema migrations on one synchronous connection."""

    # Alembic creates its version table before revisions, so create the schema first.
    connection.execute(text(f"CREATE SCHEMA IF NOT EXISTS {SHARED_SCHEMA}"))
    connection.commit()
    connection.execute(text(f"SET search_path TO {SHARED_SCHEMA}"))
    connection.commit()
    context.configure(connection=connection, **context_options())

    # Keep Alembic in charge of the migration transaction.
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations(database_url: str) -> None:
    """Run shared-schema migrations through an async SQLAlchemy engine."""

    # Use an operation-scoped pool because each organization has its own database.
    connectable = create_async_engine(database_url, poolclass=pool.NullPool)
    try:
        async with connectable.connect() as connection:
            await connection.run_sync(do_run_migrations)
    finally:
        await connectable.dispose()


def run_migrations_online() -> None:
    """Run shared-schema migrations in online mode."""

    # Require the organization database URL supplied by the control-plane migration runner.
    database_url = config.get_main_option("sqlalchemy.url")
    if database_url is None:
        raise RuntimeError("Alembic sqlalchemy.url is not configured")

    # Async drivers need an async engine and a synchronous Alembic callback.
    parsed_url = make_url(database_url)
    if parsed_url.drivername.endswith(("aiosqlite", "aiomysql", "asyncpg")):
        asyncio.run(run_async_migrations(database_url))
        return

    # Synchronous drivers can run Alembic directly on their connection.
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        do_run_migrations(connection)


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
