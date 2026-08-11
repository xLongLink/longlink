import contextlib
from typing import Protocol
from src.utils import urls
from sqlalchemy import event
from collections.abc import AsyncGenerator
from src.environments import env
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

Session: async_sessionmaker[AsyncSession] | None = None


class SQLiteConnection(Protocol):
    """Describe the DBAPI operation used to enable SQLite foreign keys."""

    def execute(self, statement: str) -> object:
        """Execute one SQLite statement."""


def enable_sqlite_foreign_keys(engine: AsyncEngine) -> None:
    """Enable foreign-key enforcement for every connection on one SQLite engine."""

    # SQLite disables foreign keys by default, unlike Platform production databases.
    @event.listens_for(engine.sync_engine, "connect")
    def configure_connection(connection: SQLiteConnection, _record: object) -> None:
        """Enable foreign keys before SQLite connections serve queries."""

        connection.execute("PRAGMA foreign_keys=ON")


async def get_session() -> async_sessionmaker[AsyncSession]:
    """Return a SQLAlchemy sessionmaker instance."""
    global Session

    # Reuse the initialized session factory.
    if Session is not None:
        return Session

    connection = urls.database(env.DATABASE_URL)

    engine_kwargs: dict[str, object] = {
        "connect_args": connection.connect_args,
        "pool_pre_ping": True,
        "pool_recycle": 20,
    }

    # Match PostgreSQL semantics and avoid InnoDB absent-key gap-lock deadlocks.
    if connection.url.drivername == "mysql+aiomysql":
        engine_kwargs["isolation_level"] = "READ COMMITTED"

    # Enable LIFO pooling for network database connections.
    if not connection.url.drivername.startswith("sqlite+"):
        engine_kwargs["pool_use_lifo"] = True

    engine = create_async_engine(connection.url, **engine_kwargs)

    # Match production referential integrity for SQLite development databases.
    if connection.url.drivername.startswith("sqlite+"):
        enable_sqlite_foreign_keys(engine)

    Session = async_sessionmaker(engine, expire_on_commit=False)

    return Session


@contextlib.asynccontextmanager
async def session_scope() -> AsyncGenerator[AsyncSession, None]:
    """Yield one SQLAlchemy session from the shared session factory."""

    session_factory = await get_session()

    # Open one session for the caller's scoped work.
    async with session_factory() as session:
        yield session
