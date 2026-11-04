import jwt
from uuid import UUID
from longlink import identity, permissions
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
        require_identity: bool,
        local_user_id: UUID | None,
        allow_development_identity: bool = False,
    ) -> None:
        """Store the application's identity admission policy."""

        self.app = app
        self.identity_secret = identity_secret
        self.require_identity = require_identity
        self.local_user_id = local_user_id
        self.allow_development_identity = allow_development_identity and not require_identity

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
        request = Request(scope)
        user = None
        if self.identity_secret:
            try:
                user, access = identity.identity_token_data(request.headers.get("x-longlink-identity", ""), self.identity_secret)
                if self.require_identity and access is None:
                    raise jwt.InvalidTokenError("Endpoint permissions are required")
                scope["longlink.access"] = access

            # Invalid assertions remain anonymous until the route's identity policy is enforced.
            except jwt.PyJWTError:
                user = None

        # Local profiles come from the SDK frontend, never from production credentials.
        development_cookie = request.cookies.get("longlink-development-user") if self.allow_development_identity else None
        if user is None and development_cookie is not None:
            try:
                development_identity = identity.DevelopmentIdentity.model_validate_json(unquote(development_cookie))
            except ValidationError:
                response = JSONResponse({"detail": "Invalid development identity"}, status_code=401)
                await response(scope, receive, send)
                return

            # Apply the same endpoint grants as a Platform-assigned Solution role.
            user = development_identity.user
            catalog = request.app.state.permission_catalog
            access = permissions.Access(
                catalog=catalog.digest,
                endpoints=[index for index, endpoint in enumerate(catalog.endpoints) if development_identity.role in endpoint.roles],
            )
            scope["longlink.access"] = access

        # Only Kubernetes liveness and readiness probes are anonymous in production.
        if self.require_identity and user is None and not (request.method == "GET" and request.url.path in {"/health", "/ready"}):
            response = JSONResponse({"detail": "Authentication required"}, status_code=401)
            await response(scope, receive, send)
            return

        # Persist verified profiles before any route can create user-referencing records.
        if user is not None:
            await request.app.state.longlink.database.sync_user(user)

        # Reset audit identity after response streaming, background work, or failure.
        with audit.actor(user.id if user is not None else self.local_user_id):
            await self.app(scope, receive, send)
