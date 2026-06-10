from fastapi import Depends, HTTPException, status
from src.auth import authadmin
from src.router import router
from src.models.compute import ComputeRegistryCreate, ComputeRegistryResponse
from src.adapters.compute import K8s
from src.database.models.users import User
from src.database.services.compute import compute


@router.get("/api/compute", response_model=list[ComputeRegistryResponse])
async def list_compute_registries(_user: User = Depends(authadmin)) -> list[ComputeRegistryResponse]:
    """Return all registered compute backends."""

    return await compute.list()


@router.get("/api/compute/{registry_id}", response_model=ComputeRegistryResponse)
async def get_compute_registry(
    registry_id: int,
    _user: User = Depends(authadmin),
) -> ComputeRegistryResponse:
    """Return one compute backend registration."""

    registry = await compute.get(registry_id)
    if registry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Compute '{registry_id}' not found")

    return registry


@router.post("/api/compute", response_model=ComputeRegistryResponse)
async def create_compute_registry(
    payload: ComputeRegistryCreate,
    _user: User = Depends(authadmin),
) -> ComputeRegistryResponse:
    """Create one compute backend registration."""

    registry = await compute.create(**payload.model_dump())
    k8s = K8s(registry.kubeconfig, registry.proxy_secret)

    try:
        await k8s.cleanup()
        await k8s.setup()
    except Exception as exc:
        await compute.purge(registry.id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to initialize the compute cluster",
        ) from exc

    return {
        **registry.model_dump(),
        "deleted_at": registry.deleted_at,
        "deleted_by": None,
    }


@router.delete("/api/compute/{registry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_compute_registry(registry_id: int, user: User = Depends(authadmin)) -> None:
    """Mark one compute backend registration as deleted."""

    registry = await compute.delete(registry_id, user.id)
    if registry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Compute '{registry_id}' not found")

    return
