from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authadmin
from src.models.storages import StorageRegistryCreate, StorageRegistryResponse
from src.database.services import storage

router = APIRouter(dependencies=[Depends(authadmin)])


@router.post("/storages", response_model=StorageRegistryResponse, status_code=201)
async def create_storage_registry(payload: StorageRegistryCreate):
    """Register one Exoscale SOS backend."""

    return await storage.create(
        payload.name,
        payload.endpoint_url,
        payload.access_key_id,
        payload.secret_access_key,
    )


@router.get("/storages", response_model=list[StorageRegistryResponse])
async def list_storage_registries():
    """Return all registered storage backends."""

    return await storage.fetch()


@router.get("/storages/{registry_id}", response_model=StorageRegistryResponse)
async def get_storage_registry(registry_id: UUID):
    """Return one storage backend registration."""

    # Resolve the requested storage registry.
    registry = await storage.get(registry_id)
    if registry is None:
        raise HTTPException(status_code=404, detail="Storage registry not found")

    return registry


@router.delete("/storages/{registry_id}", status_code=204)
async def delete_storage_registry(registry_id: UUID):
    """Delete one unused Exoscale SOS backend registration."""

    # Delete only a registry that is not assigned to an Organization.
    deleted = await storage.delete(registry_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Storage registry not found")
