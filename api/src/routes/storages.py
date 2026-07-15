from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authsupport
from src.models.storages import StorageRegistryResponse
from src.database.services import storage
from src.database.models.users import User

router = APIRouter()


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
