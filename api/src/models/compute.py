from datetime import datetime
from pydantic import BaseModel, ConfigDict
from src.models.kinds import ComputeKind
from src.models.users import UserSummary


class ComputeRegistryCreate(BaseModel):
    """Request body for creating a compute registry."""

    kind: ComputeKind
    kubeconfig: str
    ingress_host: str
    location_id: int


class ComputeRegistryResponse(BaseModel):
    """Represent one compute registry in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: ComputeKind
    ingress_host: str
    location_id: int
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None


class NamespaceResponse(BaseModel):
    """Represent a compute namespace."""

    name: str


class PodResourcesResponse(BaseModel):
    """Resource requests, limits, and actual usage for a pod."""

    cpu_request: float = 0
    cpu_limit: float = 0
    ram_request: int = 0
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
