from typing import Optional
from datetime import datetime
from sqlmodel import Field, SQLModel
from sqlalchemy.ext.asyncio import (AsyncEngine, AsyncSession,
                                    async_sessionmaker, create_async_engine)
from longlink.utils.settings import Environments


class Table(SQLModel):
    """Base SQLModel for DB tables with common timestamp fields."""

    created_at: Optional[datetime] = Field(default=None, nullable=True)
    updated_at: Optional[datetime] = Field(default=None, nullable=True)


_engine: AsyncEngine | None = None
Session: async_sessionmaker[AsyncSession] | None = None


def _resolve_database_url(env: Environments) -> str:
    """Return the database URL for the current environment."""

    if env.ENV == "testing":
        return "sqlite+aiosqlite:///:memory:"

    if env.ENV == "development":
        return "sqlite+aiosqlite:///./dev.db"

    return env.DATABASE_URL


def create_engine(env: Environments) -> AsyncEngine:
    """Create and cache the async SQLAlchemy engine for the current environment."""

    global _engine

    if _engine is not None:
        return _engine

    dburl = _resolve_database_url(env)

    engine_kwargs = {
        "pool_pre_ping": True,
        "pool_recycle": 20,
    }

    if not dburl.startswith("sqlite+"):
        engine_kwargs["pool_use_lifo"] = True

    _engine = create_async_engine(dburl, **engine_kwargs)
    return _engine


def initialize_database(env: Environments) -> AsyncEngine:
    """Create the engine eagerly during package import."""

    return create_engine(env)


async def get_session() -> async_sessionmaker[AsyncSession]:
    """Return a SQLAlchemy sessionmaker instance."""
    global Session, _engine

    if Session is not None:
        return Session

    if _engine is None:
        _engine = create_engine(Environments())

    # Verify connection once before exposing the session factory.
    async with _engine.connect():
        pass

    Session = async_sessionmaker(_engine, expire_on_commit=False)

    # Auto-create tables for SQLite only.
    if str(_engine.url).startswith("sqlite+"):
        async with _engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)

    return Session
