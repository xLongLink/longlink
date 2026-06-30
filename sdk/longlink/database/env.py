import asyncio
from alembic import context
from sqlmodel import SQLModel
from sqlalchemy.engine import Connection
from longlink.database.base import create_engine
from longlink.utils.settings import Envs
from longlink.database.migrations import include_object

settings = Envs()
engine = create_engine(settings)
target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    """Run Alembic migrations in offline mode."""
    context.configure(
        url=str(engine.url),
        target_metadata=target_metadata,
        include_object=include_object,
        literal_binds=True,
        compare_type=True,
        render_as_batch=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Run Alembic migrations using a synchronous migration connection."""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_object=include_object,
        compare_type=True,
        render_as_batch=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Run Alembic migrations in online mode."""
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
