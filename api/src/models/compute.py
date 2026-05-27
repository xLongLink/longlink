from pydantic import BaseModel

from src.models.kinds import ComputeKind


class ComputeRegistryCreate(BaseModel):
    """Request body for creating a compute registry."""

    kind: ComputeKind
    name: str
    kube_config_path: str
    ingress_host: str
    ingress_name: str


class ComputeRegistryResponse(BaseModel):
    """Represent one compute registry in API responses."""

    id: int
    kind: ComputeKind
    name: str
    kube_config_path: str
    ingress_host: str
    ingress_name: str


DockerRegistryCreate = ComputeRegistryCreate
