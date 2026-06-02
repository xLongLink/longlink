import src.db as db
from fastapi import Depends, APIRouter, HTTPException, status
from src.auth import authadmin
from src.models import ComputeRegistryCreate, ComputeRegistryResponse
from src.adapters.compute.k8s import K8s

router = APIRouter(prefix="/api/compute")


@router.get("", response_model=list[ComputeRegistryResponse])
async def list_compute_registries(_user: db.User = Depends(authadmin)) -> list[ComputeRegistryResponse]:
    """Return all registered compute backends."""

    return await db.compute.list()


@router.get("/{registry_id}", response_model=ComputeRegistryResponse)
async def get_compute_registry(
    registry_id: int,
    _user: db.User = Depends(authadmin),
) -> ComputeRegistryResponse:
    """Return one compute backend registration."""

    registry = await db.compute.get(registry_id)
    if registry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Compute '{registry_id}' not found")

    return registry


@router.post("", response_model=ComputeRegistryResponse)
async def create_compute_registry(
    payload: ComputeRegistryCreate,
    _user: db.User = Depends(authadmin),
) -> ComputeRegistryResponse:
    """Create one compute backend registration."""

    registry = await db.compute.create(**payload.model_dump())

    try:
        K8s(registry.kubeconfig, registry.ingress_name, registry.proxy_secret)
    except Exception as exc:
        await db.compute.delete(registry.id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to bootstrap the cluster proxy",
        ) from exc

    return registry


@router.delete("/{registry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_compute_registry(registry_id: int, _user: db.User = Depends(authadmin)) -> None:
    """Delete one compute backend registration."""

    registry = await db.compute.delete(registry_id)
    if registry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Compute '{registry_id}' not found")

    return
