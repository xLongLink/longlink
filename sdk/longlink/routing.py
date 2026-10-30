from typing import TYPE_CHECKING, Any
from fastapi import routing
from longlink import permissions
from fastapi.types import DecoratedCallable
from collections.abc import Callable, Sequence

type Roles = Sequence[str] | None


class RouteDecorators:
    """Share role-aware FastAPI decorators between applications and routers."""

    if TYPE_CHECKING:

        def add_api_route(self, path: str, endpoint: Callable[..., Any], **kwargs: Any) -> None:
            """Register the endpoint through its owning FastAPI application or router."""

    def api_route(self, path: str, *, roles: Roles = None, **kwargs: Any) -> Callable[[DecoratedCallable], DecoratedCallable]:
        """Register route-specific roles without wrapping or modifying the endpoint."""

        # Preserve standard OpenAPI extensions while replacing method-based role defaults.
        if roles is not None:
            if isinstance(roles, str) or not isinstance(roles, Sequence):
                raise ValueError("Roles must be a sequence of names")
            roles = list(roles)
            if (
                len(roles) > 64
                or any(not isinstance(name, str) or permissions.ROLE_PATTERN.fullmatch(name) is None for name in roles)
                or len(set(roles)) != len(roles)
            ):
                raise ValueError("Roles must be unique lowercase identifiers of at most 64 characters, with at most 64 roles")
            kwargs["openapi_extra"] = {**(kwargs.get("openapi_extra") or {}), "x-longlink-roles": roles}

        def decorator(endpoint: DecoratedCallable) -> DecoratedCallable:
            """Leave callable identity and dependency signatures owned by FastAPI."""

            self.add_api_route(path, endpoint, **kwargs)
            return endpoint

        return decorator

    def get(self, path: str, *, roles: Roles = None, **kwargs: Any) -> Callable[[DecoratedCallable], DecoratedCallable]:
        """Declare a GET endpoint with optional role defaults."""

        return self.api_route(path, roles=roles, methods=["GET"], **kwargs)

    def post(self, path: str, *, roles: Roles = None, **kwargs: Any) -> Callable[[DecoratedCallable], DecoratedCallable]:
        """Declare a POST endpoint with optional role defaults."""

        return self.api_route(path, roles=roles, methods=["POST"], **kwargs)

    def put(self, path: str, *, roles: Roles = None, **kwargs: Any) -> Callable[[DecoratedCallable], DecoratedCallable]:
        """Declare a PUT endpoint with optional role defaults."""

        return self.api_route(path, roles=roles, methods=["PUT"], **kwargs)

    def patch(self, path: str, *, roles: Roles = None, **kwargs: Any) -> Callable[[DecoratedCallable], DecoratedCallable]:
        """Declare a PATCH endpoint with optional role defaults."""

        return self.api_route(path, roles=roles, methods=["PATCH"], **kwargs)

    def delete(self, path: str, *, roles: Roles = None, **kwargs: Any) -> Callable[[DecoratedCallable], DecoratedCallable]:
        """Declare a DELETE endpoint with optional role defaults."""

        return self.api_route(path, roles=roles, methods=["DELETE"], **kwargs)

    def head(self, path: str, *, roles: Roles = None, **kwargs: Any) -> Callable[[DecoratedCallable], DecoratedCallable]:
        """Declare a HEAD endpoint with optional role defaults."""

        return self.api_route(path, roles=roles, methods=["HEAD"], **kwargs)

    def options(self, path: str, *, roles: Roles = None, **kwargs: Any) -> Callable[[DecoratedCallable], DecoratedCallable]:
        """Declare an OPTIONS endpoint with optional role defaults."""

        return self.api_route(path, roles=roles, methods=["OPTIONS"], **kwargs)


class APIRouter(RouteDecorators, routing.APIRouter):
    """Extend FastAPI routers with route-local role declarations."""
