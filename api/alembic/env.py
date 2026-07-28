import asyncio
import logging.config
from alembic import context
from sqlmodel import SQLModel
from src.utils import urls
from sqlalchemy import pool
from src.environments import env
from sqlalchemy.engine import Connection
from src.database.models import users, computes, storages, databases, operations, association, invitations, applications, organizations
from sqlalchemy.ext.asyncio import create_async_engine

# Configure Alembic with the current Platform database URL.
config = context.config
config.set_main_option("sqlalchemy.url", env.DATABASE_URL.replace("%", "%%"))

# Apply configured migration logging when Alembic has an ini file.
if config.config_file_name is not None:
    logging.config.fileConfig(config.config_file_name)

# Expose all imported SQLModel tables to migration autogeneration.
target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    """Emit migrations without opening a database connection."""

    # Configure deterministic SQL generation from the database URL.
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    # Emit all pending migrations within one Alembic transaction.
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations through a live database connection."""

    # Validate and normalize the configured database URL.
    configured_url = config.get_main_option("sqlalchemy.url")
    if configured_url is None:
        raise RuntimeError("Alembic sqlalchemy.url is not configured")

    database = urls.database(configured_url)

    async def run_async_migrations() -> None:
        """Run Alembic migrations through an async SQLAlchemy engine."""

        # Create one unpooled async engine for the migration run.
        connectable = create_async_engine(database.url, connect_args=database.connect_args, poolclass=pool.NullPool)

        def do_run_migrations(sync_connection: Connection) -> None:
            """Configure Alembic against the synchronous bridge connection."""

            # Bind Alembic to the bridge and execute migrations transactionally.
            context.configure(connection=sync_connection, target_metadata=target_metadata)

            with context.begin_transaction():
                context.run_migrations()

        try:
            # Run synchronous Alembic operations through the async connection.
            async with connectable.connect() as connection:
                await connection.run_sync(do_run_migrations)
        finally:
            # Release engine resources after every migration attempt.
            await connectable.dispose()

    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
