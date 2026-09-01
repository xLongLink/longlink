import asyncio
from uuid import UUID
from datetime import datetime
from sqlmodel import Field, SQLModel
from contextlib import asynccontextmanager
from sqlalchemy.orm import relationship, declared_attr
from collections.abc import AsyncGenerator
from longlink.database import urls
from sqlalchemy.engine import URL, make_url
from longlink.shared.models import Audit
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine
from longlink.database.types import UTCDateTime
from longlink.utils.settings import Envs
from sqlmodel.ext.asyncio.session import AsyncSession

database_metadata = SQLModel.metadata


class AuditTable(SQLModel):
    """Base SQLModel for Application tables that track Platform users."""

    model_config = SQLModel.model_config.copy()
    model_config["ignored_types"] = (declared_attr,)

    # Audit timestamps
    created_at: datetime | None = Field(default=None, sa_type=UTCDateTime)
    updated_at: datetime | None = Field(default=None, sa_type=UTCDateTime)
    deleted_at: datetime | None = Field(default=None, sa_type=UTCDateTime)

    # Audit user identifiers
    created_id: UUID | None = Field(default=None, foreign_key="audit.id")
    updated_id: UUID | None = Field(default=None, foreign_key="audit.id")
    deleted_id: UUID | None = Field(default=None, foreign_key="audit.id")

    # Audit user relationships
    created_by = declared_attr(lambda cls: relationship(Audit, foreign_keys=[cls.created_id], lazy="selectin"))
    updated_by = declared_attr(lambda cls: relationship(Audit, foreign_keys=[cls.updated_id], lazy="selectin"))
    deleted_by = declared_attr(lambda cls: relationship(Audit, foreign_keys=[cls.deleted_id], lazy="selectin"))


def create_engine(env: Envs) -> AsyncEngine:
    """Create the async SQLModel engine for the current environment."""

    # Testing uses an isolated in-memory SQLite database.
    if env.ENV == "testing":
        dburl = make_url("sqlite+aiosqlite:///:memory:")

    # Development keeps data in a local SQLite file.
    elif env.ENV == "development":
        dburl = make_url("sqlite+aiosqlite:///./dev.db")

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
        )

    # Configure connection health checks for every database backend.
    engine_kwargs: dict[str, object] = {
        "pool_pre_ping": True,
        "pool_recycle": 20,
    }

    # Enable LIFO pooling for network database connections.
    if dburl.get_backend_name() != "sqlite":
        engine_kwargs["pool_use_lifo"] = True

    # Preserve the Platform-selected TLS mode and configure UTC PostgreSQL sessions.
    connect_args = urls.connect_args(
        dburl,
        schema=env.DATABASE_SCHEMA,
        ssl=env.DATABASE_SSLMODE,
    )
    if connect_args:
        engine_kwargs["connect_args"] = connect_args

    return create_async_engine(dburl, **engine_kwargs)


class Database:
    """Own one Application's lazy database engine and sessions."""

    def __init__(self, env: Envs) -> None:
        """Store the Application environment without opening a connection."""

        self._env = env
        self._engine: AsyncEngine | None = None
        self._sessions: async_sessionmaker[AsyncSession] | None = None
        self._initialization_lock = asyncio.Lock()

    async def _session_factory(self) -> async_sessionmaker[AsyncSession]:
        """Initialize and return the Application session factory."""

        # Initialize the engine once when concurrent requests arrive before startup completes.
        if self._sessions is None:
            async with self._initialization_lock:
                if self._sessions is None:
                    engine = create_engine(self._env)

                    # Auto-create tables for SQLite only.
                    if engine.url.get_backend_name() == "sqlite":
                        async with engine.begin() as conn:
                            await conn.run_sync(database_metadata.create_all)
                    else:
                        # Release failed connections so a later request can retry initialization.
                        try:
                            async with engine.connect():
                                pass
                        except BaseException:
                            await engine.dispose()
                            raise

                    # Publish the initialized engine and factory together.
                    self._engine = engine
                    self._sessions = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        return self._sessions

    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        """Yield one Application-owned database session."""

        # Open one session from the lazy Application session factory.
        async with (await self._session_factory())() as session:
            yield session

    async def dispose(self) -> None:
        """Release the Application database engine during shutdown."""

        # Detach state before disposal so a later startup can initialize a new engine.
        async with self._initialization_lock:
            engine = self._engine
            self._engine = None
            self._sessions = None

        if engine is not None:
            await engine.dispose()


# Register shared audit listeners after AuditTable is fully defined.
from longlink.database import audit
