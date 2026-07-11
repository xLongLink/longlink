from types import TracebackType
from .base import User, Table
from .base import get_session as create_session
from .base import create_engine
from .base import get_session_maker as create_session_maker
from contextlib import AbstractAsyncContextManager
from collections.abc import Generator
from sqlalchemy.ext.asyncio import async_sessionmaker
from longlink.utils.settings import Envs
from sqlmodel.ext.asyncio.session import AsyncSession

get_session_maker = create_session_maker


class DatabaseSession:
    """Database session access that supports current and legacy SDK callers."""

    def __init__(self) -> None:
        """Initialize the session context manager."""

        self._context: AbstractAsyncContextManager[AsyncSession] = create_session()

    def __await__(self) -> Generator[object, None, async_sessionmaker[AsyncSession]]:
        """Return a session factory for older generated applications."""

        return create_session_maker().__await__()

    async def __aenter__(self) -> AsyncSession:
        """Open one async database session."""

        return await self._context.__aenter__()

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> bool | None:
        """Close one async database session."""

        return await self._context.__aexit__(exc_type, exc, traceback)


def get_session() -> DatabaseSession:
    """Return database session access for SDK callers."""

    return DatabaseSession()


class Database:
    """Placeholder DB facade for SDK public API."""

    Table = Table

    @staticmethod
    def get_session() -> DatabaseSession:
        """Return an async context manager for one database session."""

        return DatabaseSession()

    @staticmethod
    async def get_session_maker():
        """Return the configured async session factory."""

        return await create_session_maker()


def create_db(env: Envs):
    """Create the database facade for the current environment."""

    create_engine(env)
    return Database()
