import jwt
from typing import Annotated
from fastapi import Depends, FastAPI, Request
from longlink import identity
from dataclasses import dataclass
from fsspec.spec import AbstractFileSystem
from collections.abc import Callable, Awaitable, AsyncGenerator
from longlink.database import audit
from starlette.responses import Response
from longlink.shared.models import Audit
from sqlmodel.ext.asyncio.session import AsyncSession


@dataclass(frozen=True, slots=True)
class _ContextData:
    """Hold Platform data and services for one Solution request."""

    user: Audit | None
    storage: AbstractFileSystem
    database: AsyncSession


async def _data(request: Request) -> AsyncGenerator[_ContextData, None]:
    """Yield the request context for a FastAPI dependency."""

    # Open one Solution-owned database session and resolve the authenticated shared user for this request.
    async with request.app.state.longlink.database.session() as database:
        user_id = audit.current_actor.get()
        user = await database.get(Audit, user_id) if user_id is not None else None
        yield _ContextData(user=user, storage=request.app.state.longlink.storage, database=database)


Context = Annotated[_ContextData, Depends(_data)]


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
        with audit.actor(user_id):
            return await call_next(request)
