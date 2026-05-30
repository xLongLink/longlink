import src.db as db
from fastapi import APIRouter, Depends, HTTPException, Response, status
from src.adapters.compute.k8s import Compute as KubernetesCompute
from src.auth import authadmin
from src.models import APIResponse, ComputeRegistryCreate, ComputeRegistryResponse

router = APIRouter(prefix="/api/compute")


async def bootstrap_compute_cluster(kubeconfig: str, ingress_name: str) -> None:
    """Provision the shared cluster entrypoint for one compute cluster."""

    compute = KubernetesCompute(kubeconfig)
    await compute.create_cluster_proxy(ingress_name)


@router.get("")
async def list_compute_registries(_user: db.User = Depends(authadmin)) -> APIResponse[list[ComputeRegistryResponse]]:
    """Return all registered compute backends."""

    registries = await db.compute.list()
    payload = [
        ComputeRegistryResponse.model_validate(registry.model_dump(exclude={"kubeconfig"}))
        for registry in registries
    ]

    return APIResponse(success=True, detail="Compute registries fetched", data=payload)


@router.get("/{registry_id}")
async def get_compute_registry(
    registry_id: int,
    _user: db.User = Depends(authadmin),
) -> APIResponse[ComputeRegistryResponse]:
    """Return one compute backend registration."""

    registry = await db.compute.get(registry_id)
    if registry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Compute '{registry_id}' not found")

    return APIResponse(
        success=True,
        detail="Compute registry fetched",
        data=ComputeRegistryResponse.model_validate(registry.model_dump(exclude={"kubeconfig"})),
    )


@router.post("")
async def create_compute_registry(
    payload: ComputeRegistryCreate,
    _user: db.User = Depends(authadmin),
) -> APIResponse[ComputeRegistryResponse]:
    """Create one compute backend registration."""

    registry = await db.compute.create(**payload.model_dump())

    try:
        await bootstrap_compute_cluster(registry.kubeconfig, registry.ingress_name)
    except Exception as exc:
        await db.compute.delete(registry.id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to bootstrap the cluster proxy",
        ) from exc

    return APIResponse(
        success=True,
        detail="Compute registry saved",
        data=ComputeRegistryResponse.model_validate(registry.model_dump(exclude={"kubeconfig"})),
    )


@router.delete("/{registry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_compute_registry(registry_id: int, _user: db.User = Depends(authadmin)) -> Response:
    """Delete one compute backend registration."""

    registry = await db.compute.delete(registry_id)
    if registry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Compute '{registry_id}' not found")

    return Response(status_code=status.HTTP_204_NO_CONTENT)
