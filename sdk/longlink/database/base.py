import asyncio
from uuid import UUID
from datetime import datetime
from sqlmodel import Field, SQLModel
from sqlmodel import Session as SyncSession
from contextlib import asynccontextmanager
from sqlalchemy.orm import relationship, declared_attr
from collections.abc import AsyncGenerator
from longlink.database import urls
from sqlalchemy.engine import URL, make_url
from longlink.shared.models import User
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from longlink.utils.settings import Envs
from longlink.database.relations import Model
from sqlmodel.ext.asyncio.session import AsyncSession

LOCAL_USER_ID = UUID("00000000-0000-0000-0000-000000000001")


class Audit(Model):
    """Base SQLModel for Solution tables that track Platform users."""

    model_config = SQLModel.model_config.copy()
    model_config["ignored_types"] = (declared_attr,)

    # Audit timestamps
    created_at: datetime | None = Field(default=None)
    updated_at: datetime | None = Field(default=None)
    deleted_at: datetime | None = Field(default=None)

    # Audit user identifiers
    created_id: UUID | None = Field(default=None, foreign_key="audit.id")
    updated_id: UUID | None = Field(default=None, foreign_key="audit.id")
    deleted_id: UUID | None = Field(default=None, foreign_key="audit.id")

    # Audit user relationships
    created_by = declared_attr(lambda cls: relationship(User, foreign_keys=[cls.created_id], lazy="selectin"))
    updated_by = declared_attr(lambda cls: relationship(User, foreign_keys=[cls.updated_id], lazy="selectin"))
    deleted_by = declared_attr(lambda cls: relationship(User, foreign_keys=[cls.deleted_id], lazy="selectin"))


def create_engine(env: Envs) -> AsyncEngine:
    """Create the async SQLModel engine for the current environment."""

    # Hide bound values in SQL logging and database exceptions, including runtime credentials.
    engine_kwargs: dict[str, object] = {"hide_parameters": True}

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

        # Configure connection health checks and reuse only for the production database.
        engine_kwargs["pool_pre_ping"] = True
        engine_kwargs["pool_recycle"] = 20
        engine_kwargs["pool_use_lifo"] = True

        # Verify the Platform CA and configure UTC PostgreSQL sessions.
        engine_kwargs["connect_args"] = urls.connect_args(
            dburl,
            schema=env.DATABASE_SCHEMA,
            certificate=env.DATABASE_CERTIFICATE,
        )

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
        if self._engine is None:
            async with self._initialization_lock:
                if self._engine is None:
                    engine = create_engine(self._env)

                    # Initialize the database without publishing partially initialized resources.
                    try:
                        if self._env.ENV == "testing":
                            async with engine.begin() as conn:
                                await conn.run_sync(SQLModel.metadata.create_all)
                        elif self._env.ENV == "development":
                            async with engine.begin() as conn:
                                await conn.run_sync(SQLModel.metadata.tables["audit"].create, checkfirst=True)
                        else:
                            async with engine.connect():
                                pass

                        # Keep a local shared user available for development and test requests.
                        if self._env.ENV != "production":
                            async with AsyncSession(engine) as session:
                                if await session.get(User, LOCAL_USER_ID) is None:
                                    name = "Development user" if self._env.ENV == "development" else "Testing user"
                                    session.add(
                                        User(
                                            id=LOCAL_USER_ID,
                                            name=name,
                                            email="local@example.com",
                                        )
                                    )
                                    await session.commit()
                    except BaseException:
                        await engine.dispose()
                        raise

                    # Publish the engine only after initialization succeeds.
                    self._engine = engine

        return self._engine

    @asynccontextmanager
    async def session(self) -> AsyncGenerator[AsyncSession, None]:
        """Yield one Solution-owned database session."""

        # Open one session bound to the initialized Solution engine.
        engine = await self._get_engine()
        session = AsyncSession(
            engine,
            expire_on_commit=False,
        )
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


# Register shared audit listeners after Audit is fully defined.
from longlink.database import audit

audit.install_listener(SyncSession, Audit)
