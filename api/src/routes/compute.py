import src.db as db
from fastapi import APIRouter, Depends, HTTPException, Response, status
from src.auth import authadmin
from src.models import APIResponse, ComputeRegistryCreate, ComputeRegistryResponse

router = APIRouter(prefix="/api/compute")


@router.get("")
async def list_compute_registries(_user: db.User = Depends(authadmin)) -> APIResponse[list[ComputeRegistryResponse]]:
    """Return all registered compute backends."""

    registries = await db.compute.list()
    payload = [
        ComputeRegistryResponse.model_validate(
                {
                    "id": registry.id,
                    "kind": registry.kind,
                    "name": registry.name,
                    "kube_config_path": registry.kube_config_path,
                    "ingress_host": registry.ingress_host,
                "ingress_name": registry.ingress_name,
            }
        )
        for registry in registries
    ]

    return APIResponse(success=True, detail="Compute registries fetched", data=payload)


@router.get("/{name}")
async def get_compute_registry(name: str, _user: db.User = Depends(authadmin)) -> APIResponse[ComputeRegistryResponse]:
    """Return one compute backend registration."""

    registry = await db.compute.get(name)
    if registry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Compute '{name}' not found")

    return APIResponse(
        success=True,
        detail="Compute registry fetched",
        data=ComputeRegistryResponse.model_validate(
            {
                "id": registry.id,
                "kind": registry.kind,
                "name": registry.name,
                "kube_config_path": registry.kube_config_path,
                "ingress_host": registry.ingress_host,
                "ingress_name": registry.ingress_name,
            }
        ),
    )


@router.post("")
async def create_compute_registry(
    payload: ComputeRegistryCreate,
    _user: db.User = Depends(authadmin),
) -> APIResponse[ComputeRegistryResponse]:
    """Create or update one compute backend registration."""

    registry = await db.compute.create(**payload.model_dump())

    return APIResponse(
        success=True,
        detail="Compute registry saved",
        data=ComputeRegistryResponse.model_validate(
            {
                "id": registry.id,
                "kind": registry.kind,
                "name": registry.name,
                "kube_config_path": registry.kube_config_path,
                "ingress_host": registry.ingress_host,
                "ingress_name": registry.ingress_name,
            }
        ),
    )


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_compute_registry(name: str, _user: db.User = Depends(authadmin)) -> Response:
    """Delete one compute backend registration."""

    registry = await db.compute.delete(name)
    if registry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Compute '{name}' not found")

    return Response(status_code=status.HTTP_204_NO_CONTENT)
