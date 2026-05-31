from typing import Any

import src.db as db
from fastapi import Depends, Response, APIRouter, HTTPException, status
from src.auth import authuser, authadmin
from src.models import ComputeRegistryCreate, ComputeRegistryResponse
from src.adapters.compute.k8s import Compute as KubernetesCompute

router = APIRouter(prefix="/api/compute")


@router.get("/usage/{org}")
async def get_org_compute_usage(org: str, user: db.User = Depends(authuser)) -> dict[str, Any]:
    """Return compute resource usage for one organization."""

    organization = await db.orgs.get(org)
    if organization is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Org '{org}' not found")

    if all(org_member.name != org for org_member in user.orgs):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Org '{org}' not found")

    if organization.location_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Org '{org}' has no location assigned",
        )

    registry = await db.compute.find_by_location(organization.location_id)
    if registry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No compute backend found for org '{org}' location",
        )

    compute = KubernetesCompute(registry.kubeconfig)
    return await compute.usage(organization=org)


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
        compute = KubernetesCompute(registry.kubeconfig)
        await compute.create_cluster_proxy(registry.ingress_name)
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
