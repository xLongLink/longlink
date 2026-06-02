from pydantic import BaseModel, ConfigDict
from src.models.kinds import ComputeKind


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
