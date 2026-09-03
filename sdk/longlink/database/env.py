import asyncio
from alembic import context
from sqlalchemy.engine import Connection
from longlink.database.base import create_engine, database_metadata
from longlink.utils.settings import Envs
from longlink.database.migrations import include_object

# Initialize the migration engine.
settings = Envs()
engine = create_engine(settings)

# Keep Solution migration state out of the shared schema resolved by the production search path.
version_table_schema = settings.DATABASE_SCHEMA if settings.ENV == "production" else None


def _configure_migrations(
    *, connection: Connection | None = None, url: str | None = None, literal_binds: bool = False
) -> None:
    """Configure shared Solution migration behavior for one Alembic execution mode."""

    # Keep online and offline schema comparison behavior aligned.
    context.configure(
        connection=connection,
        url=url,
        literal_binds=literal_binds,
        target_metadata=database_metadata,
        include_object=include_object,
        compare_type=True,
        render_as_batch=True,
        version_table_schema=version_table_schema,
    )


def run_migrations_offline() -> None:
    """Run Alembic migrations in offline mode."""

    # Configure Alembic to emit migration SQL without a live connection.
    _configure_migrations(url=str(engine.url), literal_binds=True)

    # Wrap offline migration output in Alembic's transaction context.
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Run Alembic migrations using a synchronous migration connection."""

    # Configure Alembic with the synchronous connection exposed by SQLAlchemy.
    _configure_migrations(connection=connection)

    # Wrap online migration work in Alembic's transaction context.
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Run Alembic migrations in online mode."""

    # Run synchronous Alembic work through the async database connection.
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)

    # Release migration-engine resources after the online run completes.
    await engine.dispose()


# Use Alembic's offline path when the migration context requests it.
if context.is_offline_mode():
    run_migrations_offline()

# Otherwise run migrations through the configured async engine.
else:
    asyncio.run(run_migrations_online())
