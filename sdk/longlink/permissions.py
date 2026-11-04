import re
import hashlib
from typing import Literal
from pydantic import Field, BaseModel, ConfigDict, model_validator
from collections.abc import Sequence
from fastapi.routing import RouteContext
from starlette.types import Send, Scope, ASGIApp, Receive
from starlette.responses import JSONResponse

METHODS = frozenset({"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"})
ROLE_PATTERN = re.compile(r"[a-z][a-z0-9_-]{0,63}")


class Endpoint(BaseModel):
    """Describe one registered business operation."""

    model_config = ConfigDict(extra="forbid")

    # Operation identity and default access.
    key: str = Field(max_length=520)
    path: str = Field(max_length=512, pattern=r"^/")
    roles: list[str] = Field(max_length=64)
    method: Literal["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]
    summary: str = Field(default="", max_length=256)

    @model_validator(mode="after")
    def validate_identity(self) -> "Endpoint":
        """Reject ambiguous operation keys and malformed role names."""

        if self.key != f"{self.method} {self.path}" or any(ROLE_PATTERN.fullmatch(role) is None for role in self.roles):
            raise ValueError("Invalid endpoint identity or role")
        return self


class Catalog(BaseModel):
    """Describe the complete, deterministic Solution permission definition."""

    model_config = ConfigDict(extra="forbid")

    # Image metadata contract.
    endpoints: list[Endpoint] = Field(max_length=512)

    @model_validator(mode="after")
    def validate_catalog(self) -> "Catalog":
        """Require unique sorted identities and bounded image metadata."""

        keys = [endpoint.key for endpoint in self.endpoints]
        if keys != sorted(set(keys)) or len(self.model_dump_json().encode()) > 262144:
            raise ValueError("Permission catalog must be bounded, unique, and sorted")
        return self

    @property
    def digest(self) -> str:
        """Identify exact defaults and endpoint-index ordering in runtime assertions."""

        return hashlib.sha256(self.model_dump_json().encode()).hexdigest()

    @property
    def roles(self) -> list[str]:
        """Expose built-in roles and role names discovered from endpoint declarations."""

        return sorted({"read", "write"} | {role for endpoint in self.endpoints for role in endpoint.roles})


class Access(BaseModel):
    """Carry bounded, Platform-signed endpoint grants for one runtime."""

    model_config = ConfigDict(extra="forbid")

    # Catalog-bound endpoint grants.
    catalog: str = Field(pattern=r"^[a-f0-9]{64}$")
    endpoints: list[int] = Field(max_length=512)


def discover(routes: Sequence[RouteContext]) -> Catalog:
    """Discover actual registered methods and paths independently of OpenAPI visibility."""

    endpoints: list[Endpoint] = []
    for route in routes:
        declared = (route.openapi_extra or {}).get("x-longlink-roles")
        for method in sorted(route.methods or set()):
            if method not in METHODS:
                raise ValueError(f"Unsupported permission method: {method}")
            defaults = ["read", "write"] if method in {"GET", "HEAD", "OPTIONS"} else ["write"]
            endpoint = Endpoint.model_validate(
                {
                    "key": f"{method} {route.path}",
                    "path": route.path,
                    "method": method,
                    "roles": declared if declared is not None else defaults,
                    "summary": (route.summary or route.name or "")[:256],
                }
            )
            endpoints.append(endpoint)
    endpoints.sort(key=lambda endpoint: endpoint.key)
    return Catalog(endpoints=endpoints)


class Guard:
    """Authorize the route FastAPI actually matched before dependencies execute."""

    def __init__(self, app: ASGIApp, path: str, catalog: Catalog) -> None:
        """Capture this route's method indices and immutable catalog identity."""

        self.app = app
        self.catalog = catalog.digest
        self.indices = {endpoint.method: index for index, endpoint in enumerate(catalog.endpoints) if endpoint.path == path}

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """Check endpoint grants after production identity admission; allow local development."""

        access: Access | None = scope.get("longlink.access")
        if access is not None and (access.catalog != self.catalog or self.indices.get(scope["method"]) not in access.endpoints):
            response = JSONResponse({"detail": "Endpoint permission required"}, status_code=403, headers={"cache-control": "no-store"})
            await response(scope, receive, send)
            return
        await self.app(scope, receive, send)
