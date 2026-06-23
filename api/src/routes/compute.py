from uuid import UUID
from fastapi import Depends, HTTPException
from src.auth import authadmin, authsupport
from src.router import router
from src.models.compute import (PodResponse, NamespaceResponse,
                                ComputeRegistryCreate, ComputeRegistryResponse,
                                ComputeResourcesResponse)
from src.adapters.compute import K8s
from src.database.models.users import User
from src.database.services.compute import compute


@router.get("/api/compute", response_model=list[ComputeRegistryResponse])
async def list_compute_registries(_user: User = Depends(authsupport)) -> list[ComputeRegistryResponse]:
    """Return all registered compute backends."""

    return await compute.list()


@router.get("/api/compute/{registry_id}", response_model=ComputeRegistryResponse)
async def get_compute_registry(
    registry_id: str,
    _user: User = Depends(authsupport),
) -> ComputeRegistryResponse:
    """Return one compute backend registration."""

    registry = await compute.get(registry_id)
    if registry is None:
        raise HTTPException(status_code=404, detail=f"Compute '{registry_id}' not found")

    return registry


@router.post("/api/compute", response_model=ComputeRegistryResponse)
async def create_compute_registry(
    payload: ComputeRegistryCreate,
    user: User = Depends(authsupport),
) -> ComputeRegistryResponse:
    """Create one compute backend registration."""

    registry = await compute.create(**payload.model_dump(), user=user)
    k8s = K8s(registry.kubeconfig, registry.proxy_secret)

    # Initialize the cluster immediately so failed registrations can be rolled back.
    try:
        await k8s.cleanup()
        await k8s.setup()
    except Exception as exc:
        await compute.purge(registry.id)
        raise HTTPException(
            status_code=503,
            detail="Failed to initialize the compute cluster",
        ) from exc

    return registry


@router.delete("/api/compute/{registry_id}", status_code=204)
async def delete_compute_registry(registry_id: UUID, user: User = Depends(authadmin)) -> None:
    """Mark one compute backend registration as deleted."""

    registry = await compute.delete(registry_id, user.id)
    if registry is None:
        raise HTTPException(status_code=404, detail=f"Compute '{registry_id}' not found")

    return


@router.get("/api/compute/{registry_id}/resources", response_model=ComputeResourcesResponse)
async def get_compute_resources(
    registry_id: str,
    _user: User = Depends(authsupport),
) -> ComputeResourcesResponse:
    """Return total and allocatable cluster resources."""

    registry = await compute.get(registry_id)
    if registry is None:
        raise HTTPException(status_code=404, detail=f"Compute '{registry_id}' not found")

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)
    data = await k8s.resources()
    return ComputeResourcesResponse(**data)


@router.get("/api/compute/{registry_id}/namespaces", response_model=list[NamespaceResponse])
async def list_compute_namespaces(
    registry_id: str,
    _user: User = Depends(authsupport),
) -> list[NamespaceResponse]:
    """List all namespaces on a compute backend."""

    registry = await compute.get(registry_id)
    if registry is None:
        raise HTTPException(status_code=404, detail=f"Compute '{registry_id}' not found")

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)
    names = await k8s.namespaces()
    return [NamespaceResponse(name=n) for n in names]


@router.get(
    "/api/compute/{registry_id}/namespaces/{namespace_name}/pods",
    response_model=list[PodResponse],
)
async def list_namespace_pods(
    registry_id: str,
    namespace_name: str,
    _user: User = Depends(authsupport),
) -> list[PodResponse]:
    """List all pods in a namespace on a compute backend."""

    registry = await compute.get(registry_id)
    if registry is None:
        raise HTTPException(status_code=404, detail=f"Compute '{registry_id}' not found")

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)
    pods = await k8s.pods(namespace_name)
    return [PodResponse(**p) for p in pods]
