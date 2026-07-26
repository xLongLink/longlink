import asyncio
import logging.config
from alembic import context
from sqlmodel import SQLModel
from src.utils import urls
from sqlalchemy import pool, engine_from_config
from src.environments import env
from sqlalchemy.engine import Connection, make_url
from src.database.models import users, computes, storages, databases, operations, association, invitations, applications, organizations
from sqlalchemy.ext.asyncio import create_async_engine

_model_modules = (
    users,
    computes,
    storages,
    databases,
    operations,
    invitations,
    applications,
    association,
    organizations,
)

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

    database_url = make_url(urls.database(configured_url))

    # Async drivers need Alembic's async engine path, while sync drivers can use the classic runner.
    if database_url.drivername.endswith(("aiosqlite", "asyncpg")):

        async def run_async_migrations() -> None:
            """Run Alembic migrations through an async SQLAlchemy engine."""

            # Create one unpooled async engine for the migration run.
            connectable = create_async_engine(database_url, poolclass=pool.NullPool)

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
        return

    # Create an unpooled synchronous engine from the Alembic configuration.
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    # Run migrations against one transactional synchronous connection.
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
