from typing import Iterator, Optional
from datetime import datetime
from sqlmodel import Field, Session, SQLModel
from sqlalchemy import create_engine as create_sqlalchemy_engine
from sqlalchemy.engine import Engine
from db.models.__base__ import Base
from sqlalchemy.ext.asyncio import (AsyncEngine, AsyncSession,
                                    async_sessionmaker, create_async_engine)
from longlink.utils.settings import env


class Table(SQLModel):
    """Base SQLModel for DB tables with common timestamp fields."""

    created_at: Optional[datetime] = Field(default=None, nullable=True)
    updated_at: Optional[datetime] = Field(default=None, nullable=True)


_engine: AsyncEngine | None = None
Session: async_sessionmaker[AsyncSession] | None = None


async def get_session() -> async_sessionmaker[AsyncSession]:
    """Return a SQLAlchemy sessionmaker instance."""
    global Session, _engine

    if Session is not None:
        return Session

    dburl = env.DATABASE_URL

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
