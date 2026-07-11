import urllib.parse
from uuid import UUID
from datetime import datetime
from pydantic import Field, BaseModel, ConfigDict, field_validator, model_validator
from src.models.users import UserSummary


class ComputeRegistryCreate(BaseModel):
    """Request body for creating a compute registry."""

    # Metadata
    name: str
    kubeconfig: str
    ingress_host: str = Field(min_length=1, max_length=255)
    gateway_tls_key: str | None = None
    gateway_tls_certificate: str | None = None
    gateway_load_balancer_ip: str | None = None

    # Relationships
    location_id: UUID

    @field_validator("ingress_host")
    @classmethod
    def validate_ingress_host(cls, ingress_host: str) -> str:
        """Validate a gateway ingress host or absolute HTTP(S) URL."""

        value = ingress_host.strip().rstrip("/")

        # Gateway hosts must be non-empty and safe for URL and Envoy domain composition.
        if not value or any(
            character.isspace() or ord(character) < 32 or ord(character) == 127 for character in value
        ):
            raise ValueError("Gateway ingress host contains invalid characters")

        parsed_value = urllib.parse.urlsplit(value)
        parsed_host = parsed_value if parsed_value.scheme else urllib.parse.urlsplit(f"//{value}")

        # Absolute URLs are allowed only for HTTP(S) gateway endpoints.
        if parsed_value.scheme and parsed_value.scheme not in {"http", "https"}:
            raise ValueError("Gateway ingress host URL must use HTTP or HTTPS")

        # Gateway hosts must not carry credentials, paths, query strings, or fragments.
        if (
            parsed_host.hostname is None
            or parsed_host.username
            or parsed_host.password
            or parsed_host.path not in {"", "/"}
            or parsed_host.query
            or parsed_host.fragment
        ):
            raise ValueError("Gateway ingress host is invalid")

        # Access the port property so invalid numeric ports are rejected by urllib.
        try:
            parsed_host.port
        except ValueError as exc:
            raise ValueError("Gateway ingress host port is invalid") from exc

        return value

    @model_validator(mode="after")
    def validate_gateway_tls_pair(self) -> ComputeRegistryCreate:
        """Require gateway TLS certificate and key to be supplied together."""

        has_certificate = bool((self.gateway_tls_certificate or "").strip())
        has_key = bool((self.gateway_tls_key or "").strip())

        # Gateway TLS material must be complete or omitted.
        if has_certificate != has_key:
            raise ValueError("Gateway TLS certificate and key must be provided together")

        return self


class ComputeRegistryResponse(BaseModel):
    """Represent one compute registry in API responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    slug: str
    ingress_host: str
    gateway_load_balancer_ip: str | None = None

    # Relationships
    location_id: UUID

    # Audit
    created_at: datetime
    created_by: UserSummary
    updated_at: datetime
    updated_by: UserSummary
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None


class NamespaceResponse(BaseModel):
    """Represent a compute namespace."""

    # Metadata
    name: str


class PodResourcesResponse(BaseModel):
    """Resource limits and actual usage for a pod."""

    # Limits
    cpu_limit: float = 0
    ram_limit: int = 0

    # Usage
    cpu_usage: float = 0
    ram_usage: int = 0


class PodResponse(BaseModel):
    """Represent a pod in a namespace."""

    # Metadata
    name: str
    node: str | None = None

    # State
    status: str

    # Audit
    created_at: str | None = None

    # Resources
    resources: PodResourcesResponse | None = None


class ComputeResourcesResponse(BaseModel):
    """Cluster resource totals and allocatable amounts."""

    # CPU
    cpu_total: float
    cpu_allocatable: float

    # RAM
    ram_total: int
    ram_allocatable: int
