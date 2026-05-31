from pydantic import BaseModel

from src.models.kinds import ComputeKind


class ComputeRegistryCreate(BaseModel):
    """Request body for creating a compute registry."""

    kind: ComputeKind
    kubeconfig: str
    ingress_host: str
    ingress_name: str
    location_id: int


class ComputeRegistryResponse(BaseModel):
    """Represent one compute registry in API responses."""

    id: int
    kind: ComputeKind
    ingress_host: str
    ingress_name: str
    location_id: int


DockerRegistryCreate = ComputeRegistryCreate
