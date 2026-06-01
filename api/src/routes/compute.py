import src.db as db
from fastapi import Depends, Response, APIRouter, HTTPException, status
from src.auth import authadmin
from src.models import ComputeRegistryCreate, ComputeRegistryResponse
from adapters.compute.k8s import K8s

router = APIRouter(prefix="/api/compute")


@router.get("", response_model=list[ComputeRegistryResponse])
async def list_compute_registries(_user: db.User = Depends(authadmin)) -> list[ComputeRegistryResponse]:
    """Return all registered compute backends."""

    registries = await db.compute.list()
    payload = [
        ComputeRegistryResponse.model_validate(registry.model_dump(exclude={"kubeconfig"}))
        for registry in registries
    ]

    return payload


@router.get("/{registry_id}", response_model=ComputeRegistryResponse)
async def get_compute_registry(
    registry_id: int,
    _user: db.User = Depends(authadmin),
) -> ComputeRegistryResponse:
    """Return one compute backend registration."""

    registry = await db.compute.get(registry_id)
    if registry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Compute '{registry_id}' not found")

    return ComputeRegistryResponse.model_validate(registry.model_dump(exclude={"kubeconfig"}))


@router.post("", response_model=ComputeRegistryResponse)
async def create_compute_registry(
    payload: ComputeRegistryCreate,
    _user: db.User = Depends(authadmin),
) -> ComputeRegistryResponse:
    """Create one compute backend registration."""

    registry = await db.compute.create(**payload.model_dump())

    try:
        K8s(registry.kubeconfig, registry.ingress_name)
    except Exception as exc:
        await db.compute.delete(registry.id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to bootstrap the cluster proxy",
        ) from exc

    return ComputeRegistryResponse.model_validate(registry.model_dump(exclude={"kubeconfig"}))


@router.delete("/{registry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_compute_registry(registry_id: int, _user: db.User = Depends(authadmin)) -> Response:
    """Delete one compute backend registration."""

    registry = await db.compute.delete(registry_id)
    if registry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Compute '{registry_id}' not found")

    return Response(status_code=status.HTTP_204_NO_CONTENT)
