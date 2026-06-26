from uuid import UUID
from fastapi import Depends, APIRouter
from src.auth import authadmin, authsupport
from src.errors import NotFoundError, UnavailableError
from src.models.common import SuccessResponse
from src.models.computes import PodResponse, NamespaceResponse, ComputeRegistryCreate, ComputeRegistryResponse, ComputeResourcesResponse
from src.adapters.compute import K8s
from src.database.models.users import User
from src.database.services.compute import compute


router = APIRouter()


@router.get("/api/computes", response_model=list[ComputeRegistryResponse])
async def list_compute_registries(_user: User = Depends(authsupport)) -> list[ComputeRegistryResponse]:
    """Return all registered compute backends."""

    return await compute.list()


@router.get("/api/computes/{registry_id}", response_model=ComputeRegistryResponse)
async def get_compute_registry(registry_id: UUID,_: User = Depends(authsupport)) -> ComputeRegistryResponse:
    """Return one compute backend registration."""

    registry = await compute.get(registry_id)
    if registry is None:
        raise NotFoundError("Compute registry", registry_id)

    return registry


@router.post("/api/computes", response_model=ComputeRegistryResponse)
async def create_compute_registry(payload: ComputeRegistryCreate,user: User = Depends(authsupport)) -> ComputeRegistryResponse:
    """Create one compute backend registration."""

    registry = await compute.create(**payload.model_dump(), user=user)
    k8s = K8s(registry.kubeconfig, registry.proxy_secret)

    # Initialize the cluster immediately so failed registrations can be rolled back.
    try:
        await k8s.cleanup()
        await k8s.setup()
    except Exception as exc:
        await compute.purge(registry.id)
        raise UnavailableError("Failed to initialize the compute cluster") from exc

    return registry


@router.delete("/api/computes/{registry_id}", response_model=SuccessResponse)
async def delete_compute_registry(registry_id: UUID, user: User = Depends(authadmin)) -> SuccessResponse:
    """Mark one compute backend registration as deleted."""

    registry = await compute.delete(registry_id, user.id)
    if registry is None:
        raise NotFoundError("Compute registry", registry_id)

    return SuccessResponse()


@router.get("/api/computes/{registry_id}/resources", response_model=ComputeResourcesResponse)
async def get_compute_resources(registry_id: UUID,_: User = Depends(authsupport)) -> ComputeResourcesResponse:
    """Return total and allocatable cluster resources."""

    registry = await compute.get(registry_id)
    if registry is None:
        raise NotFoundError("Compute registry", registry_id)

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)
    data = await k8s.resources()
    return ComputeResourcesResponse(**data)


@router.get("/api/computes/{registry_id}/namespaces", response_model=list[NamespaceResponse])
async def list_compute_namespaces(registry_id: UUID,_: User = Depends(authsupport)) -> list[NamespaceResponse]:
    """List all namespaces on a compute backend."""

    registry = await compute.get(registry_id)
    if registry is None:
        raise NotFoundError("Compute registry", registry_id)

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)
    names = await k8s.namespaces()
    return [NamespaceResponse(name=n) for n in names]


@router.get("/api/computes/{registry_id}/namespaces/{namespace}/pods", response_model=list[PodResponse])
async def list_namespace_pods(registry_id: UUID, namespace: str, _: User = Depends(authsupport)) -> list[PodResponse]:
    """List all pods in a namespace on a compute backend."""

    registry = await compute.get(registry_id)
    if registry is None:
        raise NotFoundError("Compute registry", registry_id)

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)
    pods = await k8s.pods(namespace)
    return [PodResponse(**p) for p in pods]
