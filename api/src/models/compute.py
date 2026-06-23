from enum import Enum
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from src.models.users import UserSummary


class ComputeKind(str, Enum):
    """Supported compute registry kinds."""

    kubernetes = "kubernetes"


class ComputeRegistryCreate(BaseModel):
    """Request body for creating a compute registry."""

    # Metadata
    kind: ComputeKind
    kubeconfig: str
    ingress_host: str

    # Relationships
    location_id: UUID


class ComputeRegistryResponse(BaseModel):
    """Represent one compute registry in API responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    kind: ComputeKind
    ingress_host: str

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

    ram_total: int
    ram_free: int
    cpu_total: float
    cpu_free: float
