import ssl
import asyncio
from uuid import UUID
from datetime import UTC, datetime
from sqlmodel import Field, SQLModel
from sqlmodel import Session as SyncSession
from contextlib import asynccontextmanager
from sqlalchemy.orm import relationship, declared_attr
from collections.abc import AsyncGenerator
from sqlmodel._compat import SQLModelConfig
from sqlalchemy.engine import URL, make_url
from sqlalchemy.dialects import sqlite, postgresql
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from longlink.database.users import User
from longlink.utils.settings import Envs
from longlink.database.relations import Model
from sqlmodel.ext.asyncio.session import AsyncSession

LOCAL_USER_ID = UUID("00000000-0000-0000-0000-000000000001")


class Audit(Model):
    """Base SQLModel for Solution tables that track Platform users."""

    model_config = SQLModelConfig(ignored_types=(declared_attr,))

    # Audit timestamps
    # The flush listener supplies required values before persistence.
    created_at: datetime = Field(default=None, nullable=False)
    updated_at: datetime = Field(default=None, nullable=False)

    # Audit user identifiers
    created_id: UUID = Field(default=None, nullable=False, foreign_key="users.id")
    updated_id: UUID = Field(default=None, nullable=False, foreign_key="users.id")

    # Audit user relationships
    created_by = declared_attr(lambda cls: relationship(User, foreign_keys=[cls.created_id], lazy="selectin"))
    updated_by = declared_attr(lambda cls: relationship(User, foreign_keys=[cls.updated_id], lazy="selectin"))


def database_url(env: Envs) -> URL:
    """Select the database URL for the current environment."""

    # Testing uses an isolated in-memory SQLite database.
    if env.ENV == "testing":
        return make_url("sqlite+aiosqlite:///:memory:")

    # Development keeps data in a local SQLite file.
    if env.ENV == "development":
        return make_url("sqlite+aiosqlite:///./dev.db")

    # Production builds the URL from injected database settings.
    return URL.create(
        "postgresql+asyncpg",
        username=env.DATABASE_USERNAME,
        password=env.DATABASE_PASSWORD,
        host=env.DATABASE_HOST,
        port=env.DATABASE_PORT,
        database=env.DATABASE_NAME,
    )


def create_engine(env: Envs) -> AsyncEngine:
    """Create the async SQLModel engine for the current environment."""

    # Hide bound values in SQL logging and database exceptions, including runtime credentials.
    dburl = database_url(env)
    engine_kwargs: dict[str, object] = {"hide_parameters": True}

    # Retain one idle connection and configure health checks only for the production database.
    if env.ENV == "production":
        engine_kwargs["pool_size"] = 1
        engine_kwargs["pool_pre_ping"] = True
        engine_kwargs["pool_recycle"] = 20
        engine_kwargs["pool_use_lifo"] = True

        # Verify the Platform CA and configure UTC PostgreSQL sessions.
        server_settings = {"timezone": "UTC"}
        if env.DATABASE_SCHEMA is not None:
            server_settings["search_path"] = f'"{env.DATABASE_SCHEMA}"'
        connect_args: dict[str, object] = {"server_settings": server_settings}
        if env.DATABASE_CERTIFICATE is not None:
            connect_args["ssl"] = ssl.create_default_context(cadata=env.DATABASE_CERTIFICATE)

        # Forward schema and TLS settings through the PostgreSQL driver's connection options.
        engine_kwargs["connect_args"] = connect_args

    return create_async_engine(dburl, **engine_kwargs)


class Database:
    """Own one Solution's lazy database engine and sessions."""

    def __init__(self, env: Envs) -> None:
        """Store the Solution environment without opening a connection."""

        self._env = env
        self._engine: AsyncEngine | None = None
        self._initialization_lock = asyncio.Lock()

    async def _get_engine(self) -> AsyncEngine:
        """Initialize and return the Solution database engine."""

        # Initialize the engine once when concurrent requests arrive before startup completes.
        if self._engine is not None:
            return self._engine

        async with self._initialization_lock:
            if self._engine is not None:
                return self._engine

            engine = create_engine(self._env)

            # Initialize the database without publishing partially initialized resources.
            try:

                # Schema setup and local-user seeding commit together.
                async with engine.begin() as conn:

                    # Testing creates all tables; other environments use committed migrations.
                    if self._env.ENV == "testing":
                        await conn.run_sync(SQLModel.metadata.create_all)

                    # Production identities arrive through signed Platform requests.
                    if self._env.ENV != "production":

                        # Seed the local user within the initialization transaction.
                        users = SQLModel.metadata.tables["users"]
                        name = "Development user" if self._env.ENV == "development" else "Testing user"
                        await conn.execute(
                            sqlite.insert(users)
                            .values(id=LOCAL_USER_ID, name=name, email="local@example.com", avatar="", updated_at=datetime.now(UTC))
                            .on_conflict_do_nothing(index_elements=[users.c.id])
                        )

            # Failed or cancelled initialization must dispose the unpublished engine.
            except BaseException:
                await engine.dispose()
                raise

            # Publish the engine only after initialization succeeds.
            self._engine = engine
            return engine

    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        """Yield one Solution-owned database session."""

        # Open one session bound to the initialized Solution engine.
        engine = await self._get_engine()
        session = AsyncSession(engine, expire_on_commit=False)
        async with session as database_session:
            yield database_session

    async def dispose(self) -> None:
        """Release the Solution database engine during shutdown."""

        # Detach state before disposal so a later startup can initialize a new engine.
        async with self._initialization_lock:
            engine = self._engine
            self._engine = None

        if engine is not None:
            await engine.dispose()

    async def sync_user(self, user: User) -> None:
        """Persist a verified profile independently of the request's business transaction."""

        # Upserts serialize concurrent first requests and ignore equal or older profile snapshots.
        engine = await self._get_engine()
        users = SQLModel.metadata.tables["users"]
        statement = postgresql.insert(users) if engine.dialect.name == "postgresql" else sqlite.insert(users)
        statement = statement.values(user.model_dump())
        async with engine.begin() as connection:
            await connection.execute(
                statement.on_conflict_do_update(
                    index_elements=[users.c.id],
                    set_={name: statement.excluded[name] for name in ("name", "email", "avatar", "updated_at")},
                    # Older assertions must not overwrite a newer local profile.
                    where=users.c.updated_at < statement.excluded.updated_at,
                )
            )


# Register audit listeners after Audit is fully defined.
from longlink.database import audit

audit.install_listener(SyncSession, Audit)
