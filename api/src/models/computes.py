from enum import Enum
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, model_validator
from src.models.users import UserSummary


class ComputeKind(str, Enum):
    """Supported compute registry kinds."""

    kubernetes = "kubernetes"


class ComputeRegistryCreate(BaseModel):
    """Request body for creating a compute registry."""

    # Metadata
    kind: ComputeKind
    name: str
    kubeconfig: str
    ingress_host: str
    gateway_tls_key: str | None = None
    gateway_tls_certificate: str | None = None
    gateway_load_balancer_ip: str | None = None

    # Relationships
    location_id: UUID

    @model_validator(mode="after")
    def validate_gateway_tls_pair(self) -> ComputeRegistryCreate:
        """Require gateway TLS certificate and key to be supplied together."""

        has_certificate = bool((self.gateway_tls_certificate or "").strip())
        has_key = bool((self.gateway_tls_key or "").strip())
        if has_certificate != has_key:
            raise ValueError("Gateway TLS certificate and key must be provided together")

        return self


class ComputeRegistryResponse(BaseModel):
    """Represent one compute registry in API responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    kind: ComputeKind
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

    name: str


class PodResourcesResponse(BaseModel):
    """Resource limits and actual usage for a pod."""

    cpu_limit: float = 0
    ram_limit: int = 0
    cpu_usage: float = 0
    ram_usage: int = 0


class PodResponse(BaseModel):
    """Represent a pod in a namespace."""

    name: str
    status: str
    node: str | None = None
    created_at: str | None = None
    resources: PodResourcesResponse | None = None


class ComputeResourcesResponse(BaseModel):
    """Cluster resource totals and allocatable amounts."""

    # CPU
    cpu_total: float
    cpu_allocatable: float

    # RAM
    ram_total: int
    ram_allocatable: int
