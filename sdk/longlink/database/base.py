from uuid import UUID
from typing import Any, ClassVar, TypedDict, cast
from datetime import datetime, timezone
from pydantic import ConfigDict
from sqlmodel import Field, SQLModel, select
from sqlalchemy import Column, DateTime
from sqlalchemy.orm import relationship, declared_attr
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import (AsyncEngine, async_sessionmaker,
                                    create_async_engine)
from longlink.utils.settings import Envs
from sqlmodel.ext.asyncio.session import AsyncSession


def utcnow() -> datetime:
    """Return the current UTC timestamp."""

    return datetime.now(timezone.utc)


class Base(SQLModel):
    """Base SQLModel for DB tables."""

    model_config: ClassVar[ConfigDict] = ConfigDict(ignored_types=(declared_attr,))


class User(Base, table=True):
    """Shared organization user table (read-only, public schema)."""

    __tablename__: ClassVar[Any] = "users"

    id: UUID | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=255)
    email: str = Field(max_length=254)
    avatar: str = Field(default="", max_length=2048)
    role_name: str = Field(default="read", max_length=32)
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



class LocalUser(TypedDict):
    """Describe a deterministic local development user."""

    id: UUID
    name: str
    email: str
    avatar: str
    role_name: str


LOCAL_USERS: tuple[LocalUser, ...] = (
    {
        "id": UUID("00000000-0000-0000-0000-000000000001"),
        "name": "Read User",
        "email": "read@local.longlink.dev",
        "avatar": "",
        "role_name": "read",
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000002"),
        "name": "Write User",
        "email": "write@local.longlink.dev",
        "avatar": "",
        "role_name": "write",
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000003"),
        "name": "Maintain User",
        "email": "maintain@local.longlink.dev",
        "avatar": "",
        "role_name": "maintain",
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000004"),
        "name": "Admin User",
        "email": "admin@local.longlink.dev",
        "avatar": "",
        "role_name": "admin",
    },
    {
        "id": UUID("00000000-0000-0000-0000-000000000005"),
        "name": "Owner User",
        "email": "owner@local.longlink.dev",
        "avatar": "",
        "role_name": "owner",
    },
)


def created_by_relationship(cls: Any):
    """Return the creator relationship for mapped subclasses."""

    return relationship(User, foreign_keys=[cls.created_id], lazy="selectin")


def updated_by_relationship(cls: Any):
    """Return the updater relationship for mapped subclasses."""

    return relationship(User, foreign_keys=[cls.updated_id], lazy="selectin")


def deleted_by_relationship(cls: Any):
    """Return the deleter relationship for mapped subclasses."""

    return relationship(User, foreign_keys=[cls.deleted_id], lazy="selectin")


async def seed_local_users(session_maker: async_sessionmaker[AsyncSession]) -> None:
    """Create deterministic local users for SDK development auditing."""

    async with session_maker() as session:
        result = await session.exec(select(User).where(cast(Any, User.id).in_([user["id"] for user in LOCAL_USERS])))
        existing_users = {user.id: user for user in result.all()}

        # Keep seeded users deterministic if the SDK scaffold is restarted with existing data.
        for payload in LOCAL_USERS:
            user = existing_users.get(payload["id"])

            if user is None:
                session.add(User(**payload))
                continue

            user.name = payload["name"]
            user.email = payload["email"]
            user.avatar = payload["avatar"]
            user.role_name = payload["role_name"]

        await session.commit()


class Table(Base):
    """Base SQLModel for DB tables with common timestamp and audit fields."""

    __allow_unmapped__: ClassVar[bool] = True

    def __init_subclass__(cls, **kwargs: Any) -> None:
        """Allow inherited SDK relationship annotations on mapped subclasses."""

        cls.__allow_unmapped__ = True
        super().__init_subclass__(**kwargs)

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
    created_id: UUID | None = Field(
        default=None,
        foreign_key="users.id",
        nullable=True,
    )
    updated_id: UUID | None = Field(
        default=None,
        foreign_key="users.id",
        nullable=True,
    )
    deleted_id: UUID | None = Field(
        default=None,
        foreign_key="users.id",
        nullable=True,
    )

    created_by = declared_attr(created_by_relationship)
    updated_by = declared_attr(updated_by_relationship)
    deleted_by = declared_attr(deleted_by_relationship)


_engine: AsyncEngine | None = None
Session: async_sessionmaker[AsyncSession] | None = None
POSTGRESQL_DRIVER_NAMES = {
    "postgres",
    "postgresql",
    "postgresql+psycopg",
    "postgresql+psycopg2",
    "postgresql+asyncpg",
}


def normalize_database_url(database_url: str) -> str:
    """Normalize DATABASE_URL to a URL that SQLAlchemy can use in async mode."""

    url = make_url(database_url)

    # Keep local SQLite and any future non-PostgreSQL URLs untouched.
    if url.drivername not in POSTGRESQL_DRIVER_NAMES:
        return database_url

    # SDK database access is async, so PostgreSQL connections use the asyncpg dialect.
    if url.drivername != "postgresql+asyncpg":
        url = url.set(drivername="postgresql+asyncpg")

    # sslmode is a libpq/psycopg option; asyncpg receives it as an invalid kwarg through SQLAlchemy.
    sslmode_query_keys = [key for key in url.query if key.lower() == "sslmode"]
    if sslmode_query_keys:
        url = url.difference_update_query(sslmode_query_keys)

    return url.render_as_string(hide_password=False)


def create_engine(env: Envs) -> AsyncEngine:
    """Create and cache the async SQLModel engine for the current environment."""
    global _engine

    if _engine is not None:
        return _engine

    if env.ENV == "testing":
        dburl = "sqlite+aiosqlite:///:memory:"
    elif env.ENV == "development":
        dburl = "sqlite+aiosqlite:///./dev.db"
    else:
        dburl = normalize_database_url(env.DATABASE_URL)

    engine_kwargs: dict[str, Any] = {
        "pool_pre_ping": True,
        "pool_recycle": 20,
    }

    if not dburl.startswith("sqlite+"):
        engine_kwargs["pool_use_lifo"] = True

    if env.DATABASE_SCHEMA and dburl.startswith("postgresql+asyncpg"):
        # PostgreSQL production apps write unqualified tables to their app schema
        # while still resolving the shared organization users table from public.
        engine_kwargs["connect_args"] = {
            "server_settings": {
                "search_path": f"{env.DATABASE_SCHEMA},public",
            },
        }

    _engine = create_async_engine(dburl, **engine_kwargs)
    return _engine


async def get_session() -> async_sessionmaker[AsyncSession]:
    """Return a SQLModel async sessionmaker instance."""
    global Session, _engine

    if Session is not None:
        return Session

    if _engine is None:
        _engine = create_engine(Envs())

    # Verify connection once before exposing the session factory.
    async with _engine.connect() as connection:
        await connection.run_sync(lambda _: None)

    Session = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)

    # Auto-create tables for SQLite only.
    if str(_engine.url).startswith("sqlite+"):
        async with _engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)

        await seed_local_users(Session)

    return Session
