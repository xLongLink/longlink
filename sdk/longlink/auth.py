from uuid import UUID
from fastapi import FastAPI, Request, HTTPException
from contextvars import ContextVar
from dataclasses import dataclass
from tenant.models import User as TenantUser
from collections.abc import Callable, Awaitable
from starlette.responses import Response, JSONResponse
from longlink.database.base import LOCAL_USERS

ROLE_RANKS = {
    "read": 1,
    "write": 2,
    "maintain": 3,
    "admin": 4,
    "owner": 5,
}
METHOD_REQUIRED_ROLES = {
    "GET": "read",
    "HEAD": "read",
    "OPTIONS": "read",
    "POST": "write",
    "PUT": "write",
    "PATCH": "write",
    "DELETE": "maintain",
}
PUBLIC_RUNTIME_PATHS = {"/health", "/metadata.json"}
LOCAL_USERS_BY_ID = {user.id: user for user in LOCAL_USERS}
DEFAULT_LOCAL_USER = LOCAL_USERS[0]


@dataclass(frozen=True)
class CurrentUser:
    """Request-scoped user identity exposed to SDK applications."""

    id: UUID
    name: str
    role: str
    email: str = ""
    avatar: str = ""


_current_user: ContextVar[CurrentUser | None] = ContextVar("current_user", default=None)


def get_user() -> CurrentUser:
    """Return the current request-scoped SDK user."""

    user = _current_user.get()
    if user is None:
        raise HTTPException(status_code=401, detail="User context required")

    return user


def require_role(user: CurrentUser, role: str) -> None:
    """Require the current user to have at least one role rank."""

    required_rank = ROLE_RANKS.get(role)
    if required_rank is None:
        raise ValueError(f"Unknown role '{role}'")

    if ROLE_RANKS.get(user.role, 0) < required_rank:
        raise HTTPException(status_code=403, detail=f"{role.capitalize()} access required")


def install_user_middleware(app: FastAPI, *, require_header: bool) -> None:
    """Install SDK user binding and method-level API route authorization."""

    @app.middleware("http")
    async def user_context_middleware(
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        """Bind the current user and enforce the role required by the HTTP method."""

        if request.url.path in PUBLIC_RUNTIME_PATHS:
            return await call_next(request)

        try:
            # Resolve the user once so app code and method checks see the same scoped identity.
            user = user_from_headers(
                request.headers.get("x-user-id"),
                request.headers.get("x-user-role"),
                require_header=require_header,
            )

            # SDK application APIs live under /api and use method-level default roles.
            if request.url.path == "/api" or request.url.path.startswith("/api/"):
                require_method_access(user, request.method)
        except HTTPException as exc:
            return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

        token = _current_user.set(user)
        try:
            return await call_next(request)
        finally:
            _current_user.reset(token)


def user_from_headers(user_id: str | None, role: str | None, *, require_header: bool) -> CurrentUser:
    """Resolve one request user from trusted LongLink runtime headers."""

    try:
        parsed_user_id = UUID(user_id or "")
    except ValueError:
        # Local development defaults to the read user so GET requests work without setup.
        if require_header:
            raise HTTPException(status_code=401, detail="User context required") from None

        return current_user_from_local(DEFAULT_LOCAL_USER)

    local_user = LOCAL_USERS_BY_ID.get(parsed_user_id)
    if local_user is not None:
        return current_user_from_local(local_user)

    normalized_role = (role or "").strip().lower()
    if normalized_role not in ROLE_RANKS:
        # Production proxy requests must include the trusted effective application role.
        if require_header:
            raise HTTPException(status_code=401, detail="User role context required")

        normalized_role = "read"

    return CurrentUser(
        id=parsed_user_id,
        name="",
        email="",
        avatar="",
        role=normalized_role,
    )


def current_user_from_local(user: TenantUser) -> CurrentUser:
    """Return a scoped SDK user from one deterministic local user."""

    return CurrentUser(
        id=user.id,
        name=user.name,
        email=user.email,
        avatar=user.avatar,
        role=user.role,
    )


def require_method_access(user: CurrentUser, method: str) -> None:
    """Require the current user's role to allow one HTTP method."""

    required_role = METHOD_REQUIRED_ROLES.get(method.upper(), "maintain")
    require_role(user, required_role)
