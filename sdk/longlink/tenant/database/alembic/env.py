import asyncio
from typing import Any
from alembic import context
from sqlalchemy import pool, text, engine_from_config
from sqlalchemy.engine import Connection, make_url
from sqlalchemy.ext.asyncio import create_async_engine
from longlink.tenant.constants import SHARED_SCHEMA
from longlink.tenant.database.models import shared_metadata

config = context.config
target_metadata = shared_metadata


def context_options() -> dict[str, Any]:
    """Return shared Alembic context options for tenant database migrations."""

    return {
        "target_metadata": target_metadata,
        "compare_type": True,
    }


def run_migrations_offline() -> None:
    """Run tenant database migrations in offline mode."""

    database_url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=database_url,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        **context_options(),
    )

    with context.begin_transaction():
        context.execute(f"CREATE SCHEMA IF NOT EXISTS {SHARED_SCHEMA}")
        context.execute(f"SET search_path TO {SHARED_SCHEMA}")
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Run tenant database migrations on one synchronous connection."""

    connection.execute(text(f"CREATE SCHEMA IF NOT EXISTS {SHARED_SCHEMA}"))

    # Alembic creates its version table before running revisions, so the schema bootstrap must be committed first.
    connection.commit()
    connection.execute(text(f"SET search_path TO {SHARED_SCHEMA}"))

    # Keep Alembic in charge of the migration transaction instead of reusing the SET statement transaction.
    connection.commit()
    context.configure(connection=connection, **context_options())

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations(database_url: str) -> None:
    """Run tenant database migrations through an async SQLAlchemy engine."""

    connectable = create_async_engine(database_url, poolclass=pool.NullPool)
    try:
        async with connectable.connect() as connection:
            await connection.run_sync(do_run_migrations)
    finally:
        await connectable.dispose()


def run_migrations_online() -> None:
    """Run tenant database migrations in online mode."""

    database_url = config.get_main_option("sqlalchemy.url")
    if database_url is None:
        raise RuntimeError("Alembic sqlalchemy.url is not configured")

    parsed_url = make_url(database_url)
    if parsed_url.drivername.endswith(("aiosqlite", "aiomysql", "asyncpg")):
        asyncio.run(run_async_migrations(database_url))
        return

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
