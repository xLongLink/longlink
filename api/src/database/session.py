from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
from src.environments import env
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import (AsyncEngine, AsyncSession,
                                    async_sessionmaker, create_async_engine)

_engine: AsyncEngine | None = None
Session: async_sessionmaker[AsyncSession] | None = None


async def get_session() -> async_sessionmaker[AsyncSession]:
    """Return a SQLAlchemy sessionmaker instance."""
    global Session, _engine

    if Session is not None:
        return Session

    url = make_url(env.DATABASE_URL)

    # MySQL needs an async DBAPI for SQLAlchemy's async engine.
    if (
        url.drivername == 'mysql'
        or url.drivername.startswith('mysql+')
        and not url.drivername.endswith(('asyncmy', 'aiomysql'))
    ):
        url = url.set(drivername='mysql+asyncmy')

    engine_kwargs = {
        'pool_pre_ping': True,
        'pool_recycle': 20,
    }

    if not url.drivername.startswith('sqlite+'):
        engine_kwargs['pool_use_lifo'] = True

    _engine = create_async_engine(url, **engine_kwargs)

    # Verify connection once
    async with _engine.connect():
        pass

    Session = async_sessionmaker(_engine, expire_on_commit=False)

    return Session


@asynccontextmanager
async def session_scope() -> AsyncIterator[AsyncSession]:
    """Yield one SQLAlchemy session from the shared session factory."""

    Session = await get_session()
    async with Session() as session:
        yield session
