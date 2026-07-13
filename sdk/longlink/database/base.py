from uuid import UUID
from typing import Any, ClassVar
from datetime import datetime
from pydantic import ConfigDict
from sqlmodel import Field, SQLModel
from contextlib import asynccontextmanager
from sqlalchemy import Uuid, Column, String
from sqlalchemy.orm import registry, relationship, declared_attr
from collections.abc import AsyncIterator
from sqlalchemy.engine import URL
from longlink.tenant.utils import utcnow
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine
from longlink.utils.settings import Envs
from longlink.tenant.constants import SHARED_SCHEMA
from sqlmodel.ext.asyncio.session import AsyncSession
from longlink.tenant.database.types import UTCDateTime


database_registry = registry()
database_metadata = database_registry.metadata


class Base(SQLModel, registry=database_registry):
    """Base SQLModel for DB tables."""

    metadata = database_metadata
    model_config: ClassVar[ConfigDict] = ConfigDict(ignored_types=(declared_attr,))


class User(Base, table=True):
    """Shared organization user table."""

    __tablename__: ClassVar[Any] = "users"

    # Identifier
    id: UUID = Field(sa_column=Column(Uuid(as_uuid=True), primary_key=True))

    # Metadata
    name: str = Field(sa_column=Column(String(255), nullable=False))
    role: str = Field(default="read", sa_column=Column(String(32), nullable=False))
    email: str = Field(sa_column=Column(String(254), nullable=False))
    avatar: str = Field(default="", sa_column=Column(String(2048), nullable=False))

    # Audit
    created_at: datetime = Field(default_factory=utcnow, nullable=False, sa_type=UTCDateTime)
    updated_at: datetime = Field(default_factory=utcnow, nullable=False, sa_type=UTCDateTime)
    deleted_at: datetime | None = Field(default=None, nullable=True, sa_type=UTCDateTime)


class Table(Base):
    """Base SQLModel for DB tables with common timestamp and audit fields."""

    __allow_unmapped__: ClassVar[bool] = True

    def __init_subclass__(cls, **kwargs: Any) -> None:
        """Allow inherited SDK relationship annotations on mapped subclasses."""

        cls.__allow_unmapped__ = True
        super().__init_subclass__(**kwargs)

    created_at: datetime | None = Field(default_factory=utcnow, nullable=True, sa_type=UTCDateTime)
    updated_at: datetime | None = Field(default_factory=utcnow, nullable=True, sa_type=UTCDateTime)
    deleted_at: datetime | None = Field(default=None, nullable=True, sa_type=UTCDateTime)
    created_id: UUID | None = Field(default=None, foreign_key="users.id", nullable=True)
    updated_id: UUID | None = Field(default=None, foreign_key="users.id", nullable=True)
    deleted_id: UUID | None = Field(default=None, foreign_key="users.id", nullable=True)

    created_by = declared_attr(lambda cls: relationship(User, foreign_keys=[cls.created_id], lazy="selectin"))
    updated_by = declared_attr(lambda cls: relationship(User, foreign_keys=[cls.updated_id], lazy="selectin"))
    deleted_by = declared_attr(lambda cls: relationship(User, foreign_keys=[cls.deleted_id], lazy="selectin"))


_engine: AsyncEngine | None = None
Session: async_sessionmaker[AsyncSession] | None = None


def create_engine(env: Envs) -> AsyncEngine:
    """Create and cache the async SQLModel engine for the current environment."""
    global _engine

    # Reuse the cached engine once initialized.
    if _engine is not None:
        return _engine

    # Testing uses an isolated in-memory SQLite database.
    if env.ENV == "testing":
        dburl = "sqlite+aiosqlite:///:memory:"

    # Development keeps data in a local SQLite file.
    elif env.ENV == "development":
        dburl = "sqlite+aiosqlite:///./dev.db"

    # Production builds the URL from injected database settings.
    else:
        # Production runtimes receive database connection components from the LongLink Platform.
        dburl = URL.create(
            "postgresql+asyncpg",
            username=env.DATABASE_USERNAME,
            password=env.DATABASE_PASSWORD,
            host=env.DATABASE_HOST,
            port=env.DATABASE_PORT,
            database=env.DATABASE_NAME,
        ).render_as_string(hide_password=False)

    engine_kwargs: dict[str, Any] = {
        "pool_pre_ping": True,
        "pool_recycle": 20,
    }

    # Enable LIFO pooling for network database connections.
    if not dburl.startswith("sqlite+"):
        engine_kwargs["pool_use_lifo"] = True

    # Scope PostgreSQL connections to the configured app schema.
    if env.DATABASE_SCHEMA and dburl.startswith("postgresql+asyncpg"):

        # PostgreSQL production apps write unqualified tables to their app schema
        # while still resolving the shared organization users table from shared.
        engine_kwargs["connect_args"] = {
            "server_settings": {
                "search_path": f'"{env.DATABASE_SCHEMA}",{SHARED_SCHEMA}',
            },
        }

    _engine = create_async_engine(dburl, **engine_kwargs)
    return _engine


@asynccontextmanager
async def get_session() -> AsyncIterator[AsyncSession]:
    """Yield a SQLModel async session."""

    # Open one session from the lazily initialized session factory.
    session_maker = await get_session_maker()
    async with session_maker() as session:
        yield session


async def get_session_maker() -> async_sessionmaker[AsyncSession]:
    """Return a SQLModel async sessionmaker instance."""
    global Session, _engine

    # Reuse the cached session factory once initialized.
    if Session is not None:
        return Session

    # Initialize the engine lazily when sessions are requested first.
    if _engine is None:
        _engine = create_engine(Envs())

    # Verify connection once before exposing the session factory.
    async with _engine.connect() as connection:
        await connection.run_sync(lambda _: None)

    Session = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)

    # Auto-create tables for SQLite only.
    if str(_engine.url).startswith("sqlite+"):
        # Create tables through a transactional SQLite connection.
        async with _engine.begin() as conn:
            await conn.run_sync(database_metadata.create_all)

    return Session
