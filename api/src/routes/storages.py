from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authadmin, authsupport
from src.utils import names
from src.models.storages import StorageRegistryCreate, StorageRegistryResponse
from src.database.services import storage
from src.database.models.users import User

router = APIRouter()


@router.post("/api/storages", response_model=StorageRegistryResponse, status_code=201)
async def create_storage_registry(payload: StorageRegistryCreate, _user: User = Depends(authadmin)):
    """Register one Exoscale SOS backend."""

    return await storage.create(
        payload.name,
        names.slugify(payload.name),
        payload.kind,
        payload.endpoint_url,
        payload.runtime_endpoint_url,
        payload.access_key_id,
        payload.secret_access_key,
    )


@router.get("/api/storages", response_model=list[StorageRegistryResponse])
async def list_storage_registries(_user: User = Depends(authsupport)):
    """Return all registered storage backends."""

    return await storage.fetch()


@router.get("/api/storages/{registry_id}", response_model=StorageRegistryResponse)
async def get_storage_registry(registry_id: UUID, _user: User = Depends(authsupport)):
    """Return one storage backend registration."""

    registry = await storage.get(registry_id)
    if registry is None:
        raise HTTPException(status_code=404, detail="Storage registry not found")

    return registry


@router.delete("/api/storages/{registry_id}", status_code=204)
async def delete_storage_registry(registry_id: UUID, _user: User = Depends(authadmin)):
    """Delete one unused Exoscale SOS backend registration."""

    if not await storage.delete(registry_id):
        raise HTTPException(status_code=404, detail="Storage registry not found")
