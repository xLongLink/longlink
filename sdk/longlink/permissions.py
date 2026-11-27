import re
import hashlib
from typing import Literal, get_args
from pydantic import Field, BaseModel, ConfigDict, field_validator, model_validator
from contextlib import ExitStack, contextmanager
from collections.abc import Mapping, Sequence, Generator
from fastapi.routing import RouteContext
from starlette.types import Send, Scope, ASGIApp, Receive
from starlette.responses import JSONResponse

Method = Literal["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]

METHODS = frozenset(get_args(Method))
READ_ONLY_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})
ROLE_PATTERN = re.compile(r"[a-z][a-z0-9_-]{0,63}")


def validate_roles(roles: object) -> list[str]:
    """Normalize role sequences and reject ambiguous or malformed declarations."""

    # Keep decorator and catalog inputs subject to the same role contract.
    if isinstance(roles, str) or not isinstance(roles, Sequence):
        raise ValueError("Roles must be a sequence of names")
    names = list(roles)
    if (
        len(names) > 64
        or any(not isinstance(name, str) or ROLE_PATTERN.fullmatch(name) is None for name in names)
        or len(set(names)) != len(names)
    ):
        raise ValueError("Roles must be unique lowercase identifiers of at most 64 characters, with at most 64 roles")
    return names


class Endpoint(BaseModel):
    """Describe one registered business operation."""

    model_config = ConfigDict(extra="forbid")

    # Operation identity and default access.
    path: str = Field(max_length=512, pattern=r"^/")
    roles: list[str] = Field(max_length=64)
    method: Method

    @field_validator("roles", mode="before")
    @classmethod
    def validate_roles(cls, roles: object) -> list[str]:
        """Apply the shared role declaration contract to catalog inputs."""

        return validate_roles(roles)

    @property
    def key(self) -> str:
        """Derive the unique operation identity from its registered route."""

        return f"{self.method} {self.path}"


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

    def access(self, role: str) -> "Access":
        """Resolve catalog-bound endpoint grants for a Solution role."""

        # Bind endpoint indices to the exact catalog used to resolve the role.
        indices = [index for index, endpoint in enumerate(self.endpoints) if role in endpoint.roles]
        return Access(catalog=self.digest, endpoints=indices)


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
            defaults = ["read", "write"] if method in READ_ONLY_METHODS else ["write"]
            endpoint = Endpoint.model_validate(
                {"path": route.path, "method": method, "roles": declared if declared is not None else defaults}
            )
            endpoints.append(endpoint)
    endpoints.sort(key=lambda endpoint: endpoint.key)
    return Catalog(endpoints=endpoints)


@contextmanager
def guarded(routes: Sequence[RouteContext], catalog: Catalog) -> Generator[None]:
    """Install catalog-bound guards and restore handlers when their lifetime ends."""

    # Compile grants against the same catalog identity and endpoint order.
    digest = catalog.digest
    indices: dict[str, dict[str, int]] = {}
    for index, endpoint in enumerate(catalog.endpoints):
        indices.setdefault(endpoint.path, {})[endpoint.method] = index

    # Restore installed handlers even when a later installation fails.
    with ExitStack() as stack:
        for route in routes:
            # FastAPI owns a separate executable handler for each included-router context.
            target = route._route_context or route.original_route
            original = getattr(target, "app")
            guard = Guard(original, digest, indices.get(route.path or "", {}))
            setattr(target, "app", guard)
            stack.callback(setattr, target, "app", original)
        yield


class Guard:
    """Authorize the route FastAPI actually matched before dependencies execute."""

    def __init__(self, app: ASGIApp, catalog: str, indices: Mapping[str, int]) -> None:
        """Capture this route's method indices and immutable catalog identity."""

        self.app = app
        self.catalog = catalog
        self.indices = indices

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """Check endpoint grants after production identity admission; allow local development."""

        access: Access | None = scope.get("longlink.access")
        if access is not None and (access.catalog != self.catalog or self.indices.get(scope["method"]) not in access.endpoints):
            response = JSONResponse({"detail": "Endpoint permission required"}, status_code=403, headers={"cache-control": "no-store"})
            await response(scope, receive, send)
            return
        await self.app(scope, receive, send)
