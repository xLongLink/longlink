import jwt
from typing import Annotated
from fastapi import Depends, FastAPI, Request
from longlink import identity
from dataclasses import dataclass
from fsspec.spec import AbstractFileSystem
from collections.abc import Callable, Awaitable, AsyncGenerator
from starlette.types import Send, Scope, ASGIApp, Receive
from longlink.database import audit
from starlette.responses import Response, JSONResponse
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
        yield _ContextData(user=user, storage=request.app.state.longlink.storage, database=database)  # noqa: ASYNC119


Context = Annotated[_ContextData, Depends(_data)]


class _RejectWebSockets:
    """Deny a transport that the authenticated Platform proxy does not support."""

    def __init__(self, app: ASGIApp) -> None:
        """Wrap the Solution application."""

        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """Reject direct WebSocket connections before they reach Solution routes."""

        if scope["type"] == "websocket":
            await send({"type": "websocket.close", "code": 1008})
            return
        await self.app(scope, receive, send)


def install_context_middleware(app: FastAPI, identity_secret: str | None, *, require_identity: bool = False) -> None:
    """Bind trusted Platform identity for the complete request lifecycle."""

    if require_identity and not identity_secret:
        raise ValueError("Identity secret is required for protected Solution requests")

    # WebSockets cannot pass through the Platform's role-checked HTTP proxy.
    if require_identity:
        app.add_middleware(_RejectWebSockets)

    @app.middleware("http")
    async def context_middleware(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        """Attach request identity before Solution routes run."""

        # Verify the Platform-signed user assertion before making it available to Solution code.
        user_id = None
        if identity_secret:
            try:
                user_id = identity.identity_token_user(request.headers.get("x-longlink-identity", ""), identity_secret)
            except jwt.PyJWTError:
                pass

        # Only Kubernetes liveness and readiness probes are anonymous in production.
        if require_identity and user_id is None and request.url.path not in {"/health", "/ready"}:
            return JSONResponse({"detail": "Authentication required"}, status_code=401)

        # Keep the request identity available to both FastAPI and database audit hooks.
        with audit.actor(user_id):
            return await call_next(request)
