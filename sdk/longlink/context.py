from fastapi import Request
from dataclasses import dataclass
from fsspec.spec import AbstractFileSystem
from collections.abc import AsyncIterator
from longlink.database import Audit, session
from sqlmodel.ext.asyncio.session import AsyncSession


@dataclass(frozen=True, slots=True)
class Context:
    """Hold Platform data and services for one Application request."""

    user: Audit | None
    storage: AbstractFileSystem
    database: AsyncSession


async def data(request: Request) -> AsyncIterator[Context]:
    """Yield the request context for a FastAPI dependency."""

    # Open one database session and resolve the authenticated shared user for this request.
    async with session() as database:
        user_id = getattr(request.state, "user_id", None)
        user = await database.get(Audit, user_id) if user_id is not None else None
        context = Context(user=user, storage=request.app.state.storage, database=database)
        request.state.ctx = context
        yield context
