import asyncio
from typing import Any
from alembic import context
from sqlalchemy.engine import Connection
from longlink.database.base import (create_engine, database_metadata,
                                    validate_database_schema)
from longlink.utils.settings import Envs
from longlink.database.migrations import include_object

settings = Envs()
engine = create_engine(settings)
target_metadata = database_metadata
migration_context_options: dict[str, Any] = {
    "target_metadata": target_metadata,
    "include_object": include_object,
    "compare_type": True,
    "render_as_batch": True,
}

# Keep app migration state out of the shared schema resolved by the production search path.
if settings.DATABASE_SCHEMA and str(engine.url).startswith("postgresql+"):
    migration_context_options["version_table_schema"] = validate_database_schema(
        settings.DATABASE_SCHEMA
    )


def run_migrations_offline() -> None:
    """Run Alembic migrations in offline mode."""
    context.configure(
        url=str(engine.url),
        literal_binds=True,
        **migration_context_options,
    )

    # Wrap offline migration output in Alembic's transaction context.
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Run Alembic migrations using a synchronous migration connection."""
    context.configure(
        connection=connection,
        **migration_context_options,
    )

    # Wrap online migration work in Alembic's transaction context.
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Run Alembic migrations in online mode."""

    # Run synchronous Alembic work through the async database connection.
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await engine.dispose()


# Use Alembic's offline path when the migration context requests it.
if context.is_offline_mode():
    run_migrations_offline()

# Otherwise run migrations through the configured async engine.
else:
    asyncio.run(run_migrations_online())
