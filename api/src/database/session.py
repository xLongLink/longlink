import contextlib
from collections.abc import AsyncIterator
from src.utils import urls
from src.environments import env
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

_engine: AsyncEngine | None = None
Session: async_sessionmaker[AsyncSession] | None = None


async def get_session() -> async_sessionmaker[AsyncSession]:
    """Return a SQLAlchemy sessionmaker instance."""
    global Session, _engine

    if Session is not None:
        return Session

    database_url = make_url(urls.database(env.DATABASE_URL))

    engine_kwargs = {
        "pool_pre_ping": True,
        "pool_recycle": 20,
    }

    if not database_url.drivername.startswith("sqlite+"):
        engine_kwargs["pool_use_lifo"] = True

    _engine = create_async_engine(database_url, **engine_kwargs)

    # Verify connection once before exposing the session factory.
    async with _engine.connect() as connection:
        await connection.run_sync(lambda _: None)

    Session = async_sessionmaker(_engine, expire_on_commit=False)

    return Session


@contextlib.asynccontextmanager
async def session_scope() -> AsyncIterator[AsyncSession]:
    """Yield one SQLAlchemy session from the shared session factory."""

    Session = await get_session()
    async with Session() as session:
        yield session
