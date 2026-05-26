from pydantic import BaseModel


class ComputeRegistryCreate(BaseModel):
    """Request body for creating a compute registry."""

    name: str
    kube_config_path: str
    ingress_host: str
    ingress_name: str


class ComputeRegistryResponse(BaseModel):
    """Represent one compute registry in API responses."""

    name: str
    kube_config_path: str
    ingress_host: str
    ingress_name: str


DockerRegistryCreate = ComputeRegistryCreate
