import asyncio
import logging.config
from alembic import context
from src.utils import urls
from sqlalchemy import Enum, pool
from src.environments import env
from sqlalchemy.engine import Connection
from src.database.models import registry
from sqlalchemy.ext.asyncio import create_async_engine
from alembic.runtime.environment import NameFilterType, NameFilterParentNames

# Configure Alembic with the current Platform database URL.
config = context.config
config.set_main_option("sqlalchemy.url", env.DATABASE_URL.replace("%", "%%"))

# Apply configured migration logging when Alembic has an ini file.
if config.config_file_name is not None:
    logging.config.fileConfig(config.config_file_name, disable_existing_loggers=False)

# Expose the complete Platform model registry to migration autogeneration.
target_metadata = registry.metadata

# Track type-bound enum checks, which Alembic excludes from model-side constraint comparison.
enum_check_constraints = {
    (table.name, column.type.name)
    for table in target_metadata.tables.values()
    for column in table.columns
    if isinstance(column.type, Enum) and column.type.create_constraint and column.type.name is not None
}


def include_name(name: str | None, type_: NameFilterType, parent_names: NameFilterParentNames) -> bool:
    """Exclude reflected enum checks that Alembic cannot compare with type-bound metadata."""

    return type_ != "check_constraint" or (parent_names["table_name"], name) not in enum_check_constraints


def run_migrations_offline() -> None:
    """Emit migrations without opening a database connection."""

    # Configure deterministic SQL generation from the database URL.
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_name=include_name,
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
            context.configure(connection=sync_connection, target_metadata=target_metadata, include_name=include_name)

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
