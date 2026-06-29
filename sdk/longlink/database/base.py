from typing import Any, ClassVar
from datetime import datetime, timezone
from sqlmodel import Field, SQLModel, select
from sqlalchemy import DateTime
from sqlalchemy.orm import relationship, declared_attr
from sqlalchemy.ext.asyncio import (AsyncEngine, async_sessionmaker,
                                    create_async_engine)
from longlink.utils.settings import Envs
from sqlmodel.ext.asyncio.session import AsyncSession


def utcnow() -> datetime:
    """Return the current UTC timestamp."""

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


LOCAL_USERS = (
    {"id": 1, "name": "Read User", "email": "read@local.longlink.dev"},
    {"id": 2, "name": "Write User", "email": "write@local.longlink.dev"},
    {"id": 3, "name": "Maintain User", "email": "maintain@local.longlink.dev"},
    {"id": 4, "name": "Admin User", "email": "admin@local.longlink.dev"},
    {"id": 5, "name": "Owner User", "email": "owner@local.longlink.dev"},
)


async def seed_local_users(session_maker: async_sessionmaker[AsyncSession]) -> None:
    """Create deterministic local users for SDK development auditing."""

    async with session_maker() as session:
        result = await session.exec(select(User).where(User.id.in_([user["id"] for user in LOCAL_USERS])))
        existing_users = {user.id: user for user in result.all()}

        # Keep seeded users deterministic if the SDK scaffold is restarted with existing data.
        for payload in LOCAL_USERS:
            user = existing_users.get(payload["id"])

            if user is None:
                session.add(User(**payload))
                continue

            user.name = payload["name"]
            user.email = payload["email"]

        await session.commit()


class Table(Base):
    """Base SQLModel for DB tables with common timestamp and audit fields."""

    created_at: datetime | None = Field(
        default_factory=utcnow,
        sa_type=DateTime(timezone=True),
        nullable=True,
    )
    updated_at: datetime | None = Field(
        default_factory=utcnow,
        sa_type=DateTime(timezone=True),
        nullable=True,
    )
    deleted_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        nullable=True,
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
        lambda cls: relationship(
            User,
            foreign_keys=lambda: [cls.created_id],
            lazy="selectin",
        )
    )

    updated_by: ClassVar[Any] = declared_attr(
        lambda cls: relationship(
            User,
            foreign_keys=lambda: [cls.updated_id],
            lazy="selectin",
        )
    )

    deleted_by: ClassVar[Any] = declared_attr(
        lambda cls: relationship(
            User,
            foreign_keys=lambda: [cls.deleted_id],
            lazy="selectin",
        )
    )


_engine: AsyncEngine | None = None
Session: async_sessionmaker[AsyncSession] | None = None


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
        dburl = env.DATABASE_URL

    engine_kwargs = {
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
    async with _engine.connect():
        pass

    Session = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)

    # Auto-create tables for SQLite only.
    if str(_engine.url).startswith("sqlite+"):
        async with _engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)

        await seed_local_users(Session)

    return Session
