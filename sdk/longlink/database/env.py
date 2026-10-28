import asyncio
from alembic import context
from sqlmodel import SQLModel
from sqlalchemy.engine import Connection
from longlink.database.base import database_url, create_engine
from longlink.utils.settings import Envs

# Load the migration environment.
settings = Envs()

# Keep migration state in the Solution schema.
version_table_schema = settings.DATABASE_SCHEMA if settings.ENV == "production" else None


def _run_migrations(connection: Connection | None = None, *, url: str | None = None, literal_binds: bool = False) -> None:
    """Configure and run Solution migrations in either Alembic execution mode."""

    # Keep online and offline schema comparison behavior aligned.
    context.configure(
        connection=connection,
        url=url,
        literal_binds=literal_binds,
        target_metadata=SQLModel.metadata,
        compare_type=True,
        render_as_batch=True,
        version_table_schema=version_table_schema,
    )

    # Wrap migration execution or SQL output in the same transaction context.
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Run Alembic migrations in online mode."""

    # Connect without runtime initialization so migrations own the complete schema.
    engine = create_engine(settings)

    # Release migration-engine resources even when the migration fails.
    try:
        async with engine.begin() as connection:
            await connection.run_sync(_run_migrations)
    finally:
        await engine.dispose()


# Use Alembic's offline path when the migration context requests it.
if context.is_offline_mode():
    _run_migrations(url=str(database_url(settings)), literal_binds=True)

# Otherwise run migrations through the configured async engine.
else:
    asyncio.run(run_migrations_online())
