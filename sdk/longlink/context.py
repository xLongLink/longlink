import jwt
from uuid import UUID
from fastapi import FastAPI, Request
from longlink import identity
from contextvars import ContextVar
from dataclasses import dataclass
from fsspec.spec import AbstractFileSystem
from collections.abc import Callable, Awaitable, AsyncGenerator
from longlink.database import session
from starlette.responses import Response
from longlink.shared.models import Audit
from sqlmodel.ext.asyncio.session import AsyncSession

_current_identity: ContextVar[UUID | None] = ContextVar("current_identity", default=None)


@dataclass(frozen=True, slots=True)
class Context:
    """Hold Platform data and services for one Application request."""

    user: Audit | None
    storage: AbstractFileSystem
    database: AsyncSession


async def data(request: Request) -> AsyncGenerator[Context]:
    """Yield the request context for a FastAPI dependency."""

    # Open one database session and resolve the authenticated shared user for this request.
    async with session() as database:
        user_id = request.state.longlink_identity
        user = await database.get(Audit, user_id) if user_id is not None else None
        yield Context(user=user, storage=request.app.state.longlink.storage, database=database)


def install_context_middleware(app: FastAPI, identity_secret: str | None = None) -> None:
    """Bind trusted Platform identity for the complete request lifecycle."""

    @app.middleware("http")
    async def context_middleware(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        """Attach request identity before application routes run."""

        # Verify the Platform-signed user assertion before making it available to application code.
        token = request.headers.get("x-longlink-identity")
        try:
            user_id = identity.identity_token_user(token or "", identity_secret or "")
        except jwt.PyJWTError:
            user_id = None

        # Keep the request identity available to both FastAPI and database audit hooks.
        request.state.longlink_identity = user_id
        token = _current_identity.set(user_id)
        try:
            return await call_next(request)
        finally:
            _current_identity.reset(token)
