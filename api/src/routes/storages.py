from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authadmin, authsupport
from src.utils import names
from src.models.storages import StorageRegistryCreate, StorageRegistryResponse
from src.database.services import storage
from src.database.models.users import User

router = APIRouter()


@router.get("/api/storages", response_model=list[StorageRegistryResponse])
async def list_storage_registries(_: User = Depends(authsupport)):
    """Return all registered storage backends."""

    return await storage.fetch()


@router.get("/api/storages/{registry_id}", response_model=StorageRegistryResponse)
async def get_storage_registry(registry_id: UUID, _: User = Depends(authsupport)):
    """Return one storage backend registration."""

    registry = await storage.get(registry_id)
    if registry is None:
        raise HTTPException(status_code=404, detail="Storage registry not found")

    return registry


@router.delete("/api/storages/{registry_id}", status_code=204)
async def delete_storage_registry(registry_id: UUID, user: User = Depends(authadmin)):
    """Soft-delete one storage backend registration."""

    deleted = await storage.delete(registry_id, user)
    if not deleted:
        raise HTTPException(status_code=404, detail="Storage registry not found")


@router.post("/api/storages", response_model=StorageRegistryResponse)
async def create_storage_registry(payload: StorageRegistryCreate, user: User = Depends(authadmin)):
    """Create one storage backend registration."""

    # Build a stable slug from the submitted name.
    slug = names.slugify(payload.name)
    return await storage.create(**payload.model_dump(), slug=slug, user=user)
