from typing import Any, ClassVar
from datetime import datetime, timezone
from sqlmodel import Field, SQLModel, Relationship
from sqlalchemy import Column, DateTime
from sqlalchemy.orm import declared_attr
from sqlalchemy.ext.asyncio import (AsyncEngine, AsyncSession,
                                    async_sessionmaker, create_async_engine)
from longlink.utils.settings import Envs


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(SQLModel):
    """Base SQLModel for DB tables."""
    pass


class User(Base, table=True):
    """Shared organization user table (read-only, public schema)."""

    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=255)
    email: str = Field(max_length=254)
    avatar: str | None = Field(default=None, max_length=255)


class Table(Base):
    """Base SQLModel for DB tables with common timestamp and audit fields."""

    created_at: datetime | None = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    updated_at: datetime | None = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    deleted_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    created_id: int | None = Field(
        default=None,
        foreign_key="users.id",
        nullable=True,
    )
    updated_id: int | None = Field(
        default=None,
        foreign_key="users.id",
        nullable=True,
    )
    deleted_id: int | None = Field(
        default=None,
        foreign_key="users.id",
        nullable=True,
    )

    created_by: ClassVar[Any] = declared_attr(
        lambda cls: Relationship(
            sa_relationship_kwargs={
                "foreign_keys": f"[{cls.__name__}.created_id]",
                "lazy": "selectin",
            }
        )
    )

    updated_by: ClassVar[Any] = declared_attr(
        lambda cls: Relationship(
            sa_relationship_kwargs={
                "foreign_keys": f"[{cls.__name__}.updated_id]",
                "lazy": "selectin",
            }
        )
    )

    deleted_by: ClassVar[Any] = declared_attr(
        lambda cls: Relationship(
            sa_relationship_kwargs={
                "foreign_keys": f"[{cls.__name__}.deleted_id]",
                "lazy": "selectin",
            }
        )
    )




_engine: AsyncEngine | None = None
Session: async_sessionmaker[AsyncSession] | None = None


def create_engine(env: Envs) -> AsyncEngine:
    """Create and cache the async SQLAlchemy engine for the current environment."""
    global _engine

    if _engine is not None:
        return _engine

    if env.ENV == "testing":
        dburl = "sqlite+aiosqlite:///:memory:"
    elif env.ENV == "development":
        dburl = "sqlite+aiosqlite:///./dev.db"
    else:
        dburl = env.DATABASE_URL

    engine_kwargs = {
        "pool_pre_ping": True,
        "pool_recycle": 20,
    }

    if not dburl.startswith("sqlite+"):
        engine_kwargs["pool_use_lifo"] = True

    _engine = create_async_engine(dburl, **engine_kwargs)
    return _engine


async def get_session() -> async_sessionmaker[AsyncSession]:
    """Return a SQLAlchemy sessionmaker instance."""
    global Session, _engine

    if Session is not None:
        return Session

    if _engine is None:
        _engine = create_engine(Envs())

    # Verify connection once before exposing the session factory.
    async with _engine.connect():
        pass

    Session = async_sessionmaker(_engine, expire_on_commit=False)

    # Auto-create tables for SQLite only.
    if str(_engine.url).startswith("sqlite+"):
        async with _engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)

    return Session
