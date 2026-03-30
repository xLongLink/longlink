from src.env import env
from src.db.models import Base
from sqlalchemy.ext.asyncio import (AsyncEngine, AsyncSession,
                                    async_sessionmaker, create_async_engine)

_engine: AsyncEngine | None = None
Session: async_sessionmaker[AsyncSession] | None = None


async def get_session() -> async_sessionmaker[AsyncSession]:
    """Return a SQLAlchemy sessionmaker instance."""
    global Session, _engine

    if Session is not None:
        return Session

    dburl = env.ENV_DATABASE_URL

    engine_kwargs = {
        'pool_pre_ping': True,
        'pool_recycle': 20,
    }

    if not dburl.startswith('sqlite+'):
        engine_kwargs['pool_use_lifo'] = True

    _engine = create_async_engine(dburl, **engine_kwargs)

    # Verify connection once
    async with _engine.connect():
        pass

    Session = async_sessionmaker(_engine, expire_on_commit=False)

    # Auto-create tables for SQLite only
    if dburl.startswith('sqlite+'):
        async with _engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    return Session
