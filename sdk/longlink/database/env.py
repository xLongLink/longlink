from alembic import context
from sqlmodel import SQLModel
from longlink.database.base import create_engine
from longlink.utils.settings import Environments

settings = Environments()
engine = create_engine(settings)
target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    """Run Alembic migrations in offline mode."""
    context.configure(
        url=str(engine.url),
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        render_as_batch=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run Alembic migrations in online mode."""
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            render_as_batch=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
