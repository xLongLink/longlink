import re
from uuid import UUID
from typing import Any, ClassVar
from datetime import datetime
from pydantic import ConfigDict
from sqlmodel import Field, SQLModel, select
from sqlalchemy import Uuid, Column, String, DateTime
from tenant.utils import utcnow
from tenant.models import User as TenantUser
from sqlalchemy.orm import relationship, declared_attr
from sqlalchemy.engine import URL
from sqlalchemy.ext.asyncio import (AsyncEngine, async_sessionmaker,
                                    create_async_engine)
from longlink.utils.settings import Envs
from sqlmodel.ext.asyncio.session import AsyncSession

# SQLModel accepts the SQLAlchemy type instance, while Pyright needs a looser value.
UTC_DATETIME_TYPE: Any = DateTime(timezone=True)
DATABASE_SCHEMA_PATTERN = re.compile(r"^[A-Za-z0-9_](?:[A-Za-z0-9_-]{0,61}[A-Za-z0-9_])?$")


class Base(SQLModel):
    """Base SQLModel for DB tables."""

    model_config: ClassVar[ConfigDict] = ConfigDict(ignored_types=(declared_attr,))


class User(Base, table=True):
    """Shared organization user table."""

    __tablename__: ClassVar[Any] = "users"

    # Identifier
    id: UUID = Field(sa_column=Column(Uuid(as_uuid=True), primary_key=True))

    # Metadata
    name: str = Field(sa_column=Column(String(255), nullable=False))
    role: str = Field(default="read", sa_column=Column("role_name", String(32), nullable=False))
    email: str = Field(sa_column=Column(String(254), nullable=False))
    avatar: str = Field(default="", sa_column=Column(String(2048), nullable=False, server_default=""))

    # Audit
    created_at: datetime = Field(default_factory=utcnow, nullable=False, sa_type=UTC_DATETIME_TYPE)
    updated_at: datetime = Field(default_factory=utcnow, nullable=False, sa_type=UTC_DATETIME_TYPE)
    deleted_at: datetime | None = Field(default=None, nullable=True, sa_type=UTC_DATETIME_TYPE)


LOCAL_USERS: tuple[TenantUser, ...] = (
    TenantUser(
        id=UUID("00000000-0000-0000-0000-000000000001"),
        name="Read User",
        role="read",
        email="read@local.longlink.dev",
        avatar="",
    ),
    TenantUser(
        id=UUID("00000000-0000-0000-0000-000000000002"),
        name="Write User",
        role="write",
        email="write@local.longlink.dev",
        avatar="",
    ),
    TenantUser(
        id=UUID("00000000-0000-0000-0000-000000000003"),
        name="Maintain User",
        role="maintain",
        email="maintain@local.longlink.dev",
        avatar="",
    ),
    TenantUser(
        id=UUID("00000000-0000-0000-0000-000000000004"),
        name="Admin User",
        role="admin",
        email="admin@local.longlink.dev",
        avatar="",
    ),
    TenantUser(
        id=UUID("00000000-0000-0000-0000-000000000005"),
        name="Owner User",
        role="owner",
        email="owner@local.longlink.dev",
        avatar="",
    ),
)


def validate_database_schema(database_schema: str) -> str:
    """Return a database schema name after rejecting unsafe search path input."""

    if not DATABASE_SCHEMA_PATTERN.fullmatch(database_schema):
        raise ValueError(
            "Database schema must be 1-63 letters, numbers, underscores, or hyphens, "
            "and must not start or end with a hyphen"
        )

    return database_schema


def database_schema_search_path(database_schema: str) -> str:
    """Return a PostgreSQL search path for one validated app schema and shared users."""

    return f'"{validate_database_schema(database_schema)}",shared'


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
        user_id_column = getattr(User, "id")
        result = await session.exec(select(User).where(user_id_column.in_([user.id for user in LOCAL_USERS])))
        existing_users = {user.id: user for user in result.all()}

        # Keep seeded users deterministic if the SDK scaffold is restarted with existing data.
        for payload in LOCAL_USERS:
            user = existing_users.get(payload.id)

            if user is None:
                session.add(User(**payload.model_dump()))
                continue

            user.name = payload.name
            user.role = payload.role
            user.email = payload.email
            user.avatar = payload.avatar

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
        nullable=True,
        sa_type=UTC_DATETIME_TYPE,
    )
    updated_at: datetime | None = Field(
        default_factory=utcnow,
        nullable=True,
        sa_type=UTC_DATETIME_TYPE,
    )
    deleted_at: datetime | None = Field(
        default=None,
        nullable=True,
        sa_type=UTC_DATETIME_TYPE,
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
        database_host = env.DATABASE_HOST
        database_name = env.DATABASE_NAME
        database_port = env.DATABASE_PORT
        database_password = env.DATABASE_PASSWORD
        database_username = env.DATABASE_USERNAME
        if (
            database_host is None
            or database_name is None
            or database_port is None
            or database_password is None
            or database_username is None
        ):
            raise ValueError("Production database settings require host, port, name, username, and password")

        # Production runtimes receive database connection components from the control plane.
        dburl = URL.create(
            "postgresql+asyncpg",
            username=database_username,
            password=database_password,
            host=database_host,
            port=database_port,
            database=database_name,
        ).render_as_string(hide_password=False)

    engine_kwargs: dict[str, Any] = {
        "pool_pre_ping": True,
        "pool_recycle": 20,
    }

    if not dburl.startswith("sqlite+"):
        engine_kwargs["pool_use_lifo"] = True

    if env.DATABASE_SCHEMA and dburl.startswith("postgresql+asyncpg"):
        # PostgreSQL production apps write unqualified tables to their app schema
        # while still resolving the shared organization users table from shared.
        engine_kwargs["connect_args"] = {
            "server_settings": {
                "search_path": database_schema_search_path(env.DATABASE_SCHEMA),
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
