import jwt
from uuid import UUID
from longlink import identity
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
        require_identity: bool,
        local_user_id: UUID | None,
    ) -> None:
        """Store the application's identity admission policy."""

        self.app = app
        self.identity_secret = identity_secret
        self.require_identity = require_identity
        self.local_user_id = local_user_id

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """Keep request identity bound until the downstream application finishes."""

        # WebSockets cannot pass through the Platform's role-checked HTTP proxy.
        if self.require_identity and scope["type"] == "websocket":
            await send({"type": "websocket.close", "code": 1008})
            return

        # Preserve lifespan and local WebSocket handling without binding HTTP identity.
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Verify the Platform-signed user assertion before exposing it to Solution code.
        request = Request(
            scope,
        )
        user_id = None
        if self.identity_secret:
            try:
                user_id = identity.identity_token_user(request.headers.get("x-longlink-identity", ""), self.identity_secret)
            except jwt.PyJWTError:
                pass

        # Only Kubernetes liveness and readiness probes are anonymous in production.
        if self.require_identity and user_id is None and request.url.path not in {"/health", "/ready"}:
            response = JSONResponse(
                {"detail": "Authentication required"},
                status_code=401,
            )
            await response(scope, receive, send)
            return

        # Use the seeded local user when no signed Platform identity was supplied.
        if user_id is None:
            user_id = self.local_user_id

        # Reset audit identity after response streaming, background work, or failure.
        with audit.actor(user_id):
            await self.app(scope, receive, send)
