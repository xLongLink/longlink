import jwt
from uuid import UUID
from typing import Literal
from longlink import identity
from pydantic import ValidationError
from urllib.parse import unquote
from starlette.types import Send, Scope, ASGIApp, Receive
from longlink.database import audit
from starlette.requests import Request
from starlette.responses import JSONResponse


class IdentityMiddleware:
    """Bind Platform identity and enforce supported request transports."""

    def __init__(
        self,
        app: ASGIApp,
        *,
        identity_secret: str | None,
        mode: Literal["development", "testing", "production"],
        local_user_id: UUID | None,
    ) -> None:
        """Store the application's identity admission policy."""

        self.app = app
        self.identity_secret = identity_secret
        self.mode = mode
        self.local_user_id = local_user_id

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """Keep request identity bound until the downstream application finishes."""

        # WebSockets cannot pass through the Platform's role-checked HTTP proxy.
        if self.mode == "production" and scope["type"] == "websocket":
            await send({"type": "websocket.close", "code": 1008})
            return

        # Preserve lifespan and local WebSocket handling without binding HTTP identity.
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Verify the Platform-signed user assertion before exposing it to Solution code.
        request = Request(scope)
        user = None
        scope["longlink.role"] = None
        verified = False
        if self.identity_secret:
            try:
                claims = identity.verify_identity_token(request.headers.get("x-longlink-identity", ""), self.identity_secret)
                user = claims.user
                scope["longlink.access"] = claims.access
                scope["longlink.role"] = claims.role
                verified = True

            # Invalid assertions remain anonymous until the route's identity policy is enforced.
            except jwt.PyJWTError:
                user = None

        # Local profiles come from the SDK frontend, never from production credentials.
        development_cookie = request.cookies.get("longlink-development-user") if self.mode == "development" else None
        if not verified and user is None and development_cookie is not None:
            try:
                development_identity = identity.DevelopmentIdentity.model_validate_json(unquote(development_cookie))
            except ValidationError:
                response = JSONResponse({"detail": "Invalid development identity"}, status_code=401)
                await response(scope, receive, send)
                return

            # Apply the same endpoint grants as a Platform-assigned Solution role.
            user = development_identity.user
            catalog = request.app.state.permission_catalog
            scope["longlink.access"] = catalog.access(development_identity.role)
            scope["longlink.role"] = development_identity.role

        # Match the frontend's initial local role without overriding signed anonymous requests.
        if self.mode == "development" and not verified and development_cookie is None:
            scope["longlink.role"] = "write"

        # Only verified Platform assertions or Kubernetes probes are admitted in production.
        if self.mode == "production" and not verified and not (request.method == "GET" and request.url.path in {"/health", "/ready"}):
            response = JSONResponse({"detail": "Authentication required"}, status_code=401)
            await response(scope, receive, send)
            return

        # Guest identities cannot initialize or resume the mutation-capable MCP transport.
        if (
            verified
            and user is None
            and (request.method not in {"GET", "HEAD", "OPTIONS"} or request.url.path.strip("/").split("/", 1)[0] == "mcp")
        ):
            response = JSONResponse({"detail": "Public MCP access is unavailable"}, status_code=403)
            await response(scope, receive, send)
            return

        # Persist verified profiles before any route can create user-referencing records.
        if user is not None:
            await request.app.state.longlink.database.sync_user(user)

        # Reset audit identity after response streaming, background work, or failure.
        actor_id = user.id if user is not None else None
        if not verified and self.mode != "production" and user is None:
            actor_id = self.local_user_id
        with audit.actor(actor_id):
            await self.app(scope, receive, send)
