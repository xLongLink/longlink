import asyncio
from uuid import UUID
from datetime import datetime
from sqlmodel import Field
from contextlib import asynccontextmanager
from sqlalchemy.orm import relationship, declared_attr
from collections.abc import AsyncGenerator
from longlink.database import urls
from sqlalchemy.engine import URL
from longlink.shared.models import Audit
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine
from longlink.database.types import UTCDateTime
from longlink.utils.settings import Envs
from longlink.database.registry import Base, database_metadata
from sqlmodel.ext.asyncio.session import AsyncSession


class AuditTable(Base):
    """Base SQLModel for Application tables that track Platform users."""

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


Session: async_sessionmaker[AsyncSession] | None = None
_session_initialization_lock = asyncio.Lock()


def create_engine(env: Envs) -> AsyncEngine:
    """Create the async SQLModel engine for the current environment."""

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

    # Configure connection health checks for every database backend.
    engine_kwargs: dict[str, object] = {
        "pool_pre_ping": True,
        "pool_recycle": 20,
    }

    # Enable LIFO pooling for network database connections.
    if not dburl.startswith("sqlite+"):
        engine_kwargs["pool_use_lifo"] = True

    # Preserve the Platform-selected TLS mode and configure UTC PostgreSQL sessions.
    engine_kwargs["connect_args"] = urls.connect_args(
        dburl,
        schema=env.DATABASE_SCHEMA,
        ssl=env.DATABASE_SSLMODE,
    )

    return create_async_engine(dburl, **engine_kwargs)


@asynccontextmanager
async def session() -> AsyncGenerator[AsyncSession, None]:
    """Yield an Application database session."""
    global Session

    # Initialize the engine once when concurrent requests arrive before startup completes.
    if Session is None:
        async with _session_initialization_lock:
            if Session is None:
                engine = create_engine(Envs())

                # Auto-create tables for SQLite only.
                if str(engine.url).startswith("sqlite+"):
                    # Create tables through a transactional SQLite connection.
                    async with engine.begin() as conn:
                        await conn.run_sync(database_metadata.create_all)
                else:
                    # Verify non-SQLite connections before exposing the session factory.
                    async with engine.connect():
                        pass

                # Cache the session factory after the engine connection succeeds.
                Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Open one session from the lazily initialized session factory.
    async with Session() as session:
        yield session
