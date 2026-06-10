from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession

from src.database.session import get_session


class ServiceBase:
    """Base class for DB services with a shared session helper."""

    @asynccontextmanager
    async def session(self) -> AsyncIterator[AsyncSession]:
        """Yield one SQLAlchemy session for a service operation."""

        Session = await get_session()
        async with Session() as session:
            yield session
