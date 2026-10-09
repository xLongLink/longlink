import re
from src import auth
from uuid import UUID
from typing import Annotated
from fastapi import Depends, Request, HTTPException
from contextlib import aclosing
from collections.abc import AsyncIterator
from starlette.types import Send, Scope, ASGIApp, Message, Receive
from src.environments import env
from longlink.database import audit
from src.utils.cookies import AUTH_COOKIE
from src.database.services import mcp
from starlette.datastructures import MutableHeaders
from src.database.models.users import User
from starlette.middleware.cors import CORSMiddleware


async def proxyuser(request: Request, solution_id: UUID, session: auth.Session, path: str = "") -> AsyncIterator[User]:
    """Select MCP bearer authentication without changing browser credential handling or audit lifetimes."""

    # Bearer proof is meaningful only at the selected Solution's MCP endpoint.
    is_mcp = path.rstrip("/") == "mcp"
    authorization = request.headers.get("authorization")
    challenge = f'Bearer resource_metadata="{env.PUBLIC_URL}/.well-known/oauth-protected-resource/api/v1/solutions/{solution_id}/proxy/mcp", scope="mcp"'
    if is_mcp and authorization is not None:
        scheme, _, credential = authorization.partition(" ")
        user = (
            await mcp.authenticate(session, credential, solution_id) if scheme.lower() == "bearer" and 0 < len(credential) <= 128 else None
        )
        if user is None:
            raise HTTPException(
                status_code=401, detail="Not authenticated", headers={"WWW-Authenticate": f'{challenge}, error="invalid_token"'}
            )

        # Keep the admitted identity bound until FastAPI finishes the dependency's request lifetime.
        request.state.authenticated = True
        with audit.actor(user.id):
            yield user  # noqa: ASYNC119
        return

    # Delegate browser sessions with deterministic cleanup; never fall back after invalid bearer proof.
    if is_mcp and request.cookies.get(AUTH_COOKIE) is None:
        raise HTTPException(status_code=401, detail="Not authenticated", headers={"WWW-Authenticate": challenge})
    async with aclosing(auth.authuser(request, session, request.cookies.get(AUTH_COOKIE))) as authenticated:
        async for user in authenticated:
            yield user  # noqa: ASYNC119


ProxyUser = Annotated[User, Depends(proxyuser)]


class MCPMiddleware:
    """Own MCP transport CORS and first-party approval headers without changing Platform policy."""

    def __init__(self, app: ASGIApp) -> None:
        """Configure CORS only for public discovery, token exchange, and MCP transport."""

        self.app = app
        self.cors = CORSMiddleware(
            self._serve,
            allow_origins=["*"],
            allow_methods=["GET", "POST", "DELETE"],
            allow_headers=[
                "Authorization",
                "Content-Type",
                "Accept",
                "MCP-Session-Id",
                "MCP-Protocol-Version",
                "MCP-Method",
                "MCP-Name",
                "Last-Event-Id",
            ],
            expose_headers=["WWW-Authenticate", "MCP-Session-Id", "MCP-Protocol-Version"],
        )

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """Leave consent, login, and other cookie-authenticated routes outside cross-origin access."""

        # Include only the exact UUID-based Solution resource and its corresponding discovery URL.
        path = scope.get("path", "")
        public = path in {
            "/.well-known/oauth-authorization-server",
            "/api/v1/mcp/register",
            "/api/v1/mcp/token",
            "/api/v1/mcp/revoke",
        } or re.fullmatch(r"(?:/\.well-known/oauth-protected-resource)?/api/v1/solutions/[0-9a-fA-F-]{36}/proxy/mcp/?", path)
        if scope["type"] == "http" and public:
            await self.cors(scope, receive, send)
        else:
            await self._serve(scope, receive, send)

    async def _serve(self, scope: Scope, receive: Receive, send: Send) -> None:
        """Apply approval headers to real responses, without wrapping response bodies or streams."""

        # Leave unrelated routes and CORS-generated preflights on their existing response paths.
        if scope["type"] != "http" or not scope.get("path", "").startswith(("/api/v1/mcp/", "/mcp/authorize")):
            await self.app(scope, receive, send)
            return

        async def send_headers(message: Message) -> None:
            """Protect first-party approval from framing, caching, and referrer leakage."""

            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers["Cache-Control"] = "no-store"
                headers["Referrer-Policy"] = "no-referrer"
                headers["X-Frame-Options"] = "DENY"
                headers["Content-Security-Policy"] = "frame-ancestors 'none'"
            await send(message)

        await self.app(scope, receive, send_headers)
