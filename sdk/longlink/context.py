import jwt
from uuid import UUID
from fastapi import FastAPI, Request
from longlink import identity
from contextvars import ContextVar
from dataclasses import dataclass
from fsspec.spec import AbstractFileSystem
from collections.abc import Callable, Awaitable, AsyncGenerator
from starlette.responses import Response
from longlink.shared.models import Audit
from sqlmodel.ext.asyncio.session import AsyncSession

_current_identity: ContextVar[UUID | None] = ContextVar("current_identity", default=None)


@dataclass(frozen=True, slots=True)
class Context:
    """Hold Platform data and services for one Solution request."""

    user: Audit | None
    storage: AbstractFileSystem
    database: AsyncSession


async def data(request: Request) -> AsyncGenerator[Context, None]:
    """Yield the request context for a FastAPI dependency."""

    # Open one Solution-owned database session and resolve the authenticated shared user for this request.
    async with request.app.state.longlink.database.session() as database:
        user_id = request.state.longlink_identity
        user = await database.get(Audit, user_id) if user_id is not None else None
        yield Context(user=user, storage=request.app.state.longlink.storage, database=database)


def install_context_middleware(app: FastAPI, identity_secret: str) -> None:
    """Bind trusted Platform identity for the complete request lifecycle."""

    @app.middleware("http")
    async def context_middleware(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        """Attach request identity before Solution routes run."""

        # Verify the Platform-signed user assertion before making it available to Solution code.
        try:
            user_id = identity.identity_token_user(request.headers.get("x-longlink-identity", ""), identity_secret)
        except jwt.PyJWTError:
            user_id = None

        # Keep the request identity available to both FastAPI and database audit hooks.
        request.state.longlink_identity = user_id
        token = _current_identity.set(user_id)
        try:
            return await call_next(request)
        finally:
            _current_identity.reset(token)
