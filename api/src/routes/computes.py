from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authadmin
from src.models.computes import ComputeRegistryCreate, ComputeRegistryResponse
from src.database.services import compute, operations

router = APIRouter(dependencies=[Depends(authadmin)])


@router.post("/api/computes", response_model=ComputeRegistryResponse, status_code=202)
async def create_compute_registry(payload: ComputeRegistryCreate):
    """Register a compute target and queue its initial creation."""

    registry = await compute.create(payload.name, payload.kubeconfig)
    await operations.create(registry.id)
    return registry


@router.get("/api/computes", response_model=list[ComputeRegistryResponse])
async def list_compute_registries():
    """Return all registered compute backends."""

    return await compute.fetch()


@router.get("/api/computes/{registry_id}", response_model=ComputeRegistryResponse)
async def get_compute_registry(registry_id: UUID):
    """Return one compute backend registration."""

    # Resolve the requested active compute registry.
    registry = await compute.get(registry_id)
    if registry is None:
        raise HTTPException(status_code=404, detail="Compute registry not found")

    return registry


@router.delete("/api/computes/{registry_id}", status_code=204)
async def delete_compute_registry(registry_id: UUID):
    """Remove one unused compute registration without changing its cluster."""

    # Remove only a registered compute that is not assigned to an Organization.
    deleted = await compute.delete(registry_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Compute registry not found")
