from uuid import UUID
from fastapi import FastAPI, Request
from contextvars import ContextVar
from dataclasses import dataclass
from fsspec.spec import AbstractFileSystem
from collections.abc import Callable, Awaitable, AsyncIterator
from longlink.database import Audit, session
from starlette.responses import Response
from sqlmodel.ext.asyncio.session import AsyncSession

_current_identity: ContextVar[UUID | None] = ContextVar("current_identity", default=None)


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
        user_id = request.state.longlink_identity
        user = await database.get(Audit, user_id) if user_id is not None else None
        yield Context(user=user, storage=request.app.state.longlink.storage, database=database)


def install_context_middleware(app: FastAPI) -> None:
    """Bind trusted Platform identity for the complete request lifecycle."""

    @app.middleware("http")
    async def context_middleware(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        """Attach request identity before application routes run."""

        # Parse the Platform-provided user identifier when the request has one.
        raw_user_id = request.headers.get("x-user-id")
        try:
            user_id = UUID(raw_user_id) if raw_user_id is not None else None
        except ValueError:
            user_id = None

        # Keep the request identity available to both FastAPI and database audit hooks.
        request.state.longlink_identity = user_id
        token = _current_identity.set(user_id)
        try:
            return await call_next(request)
        finally:
            _current_identity.reset(token)
