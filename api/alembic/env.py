import asyncio
from alembic import context
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine
from src.database.models import Base
from src.env import env

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config
config.set_main_option('sqlalchemy.url', env.DATABASE_URL)

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option('sqlalchemy.url')
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={'paramstyle': 'named'},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    url = make_url(config.get_main_option('sqlalchemy.url'))

    # MySQL needs an async DBAPI for Alembic's async engine path.
    if (
        url.drivername == 'mysql'
        or url.drivername.startswith('mysql+')
        and not url.drivername.endswith(('asyncmy', 'aiomysql'))
    ):
        url = url.set(drivername='mysql+asyncmy')

    # Async drivers need Alembic's async engine path, while sync drivers can use the classic runner.
    if url.drivername.endswith(('aiosqlite', 'asyncmy', 'aiomysql', 'asyncpg')):

        async def run_async_migrations() -> None:
            """Run Alembic migrations through an async SQLAlchemy engine."""

            connectable = create_async_engine(url, poolclass=pool.NullPool)

            def do_run_migrations(sync_connection) -> None:
                """Configure Alembic against the synchronous bridge connection."""

                context.configure(connection=sync_connection, target_metadata=target_metadata)

                with context.begin_transaction():
                    context.run_migrations()

            try:
                async with connectable.connect() as connection:
                    await connection.run_sync(do_run_migrations)
            finally:
                await connectable.dispose()

        asyncio.run(run_async_migrations())
        return

    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix='sqlalchemy.',
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
