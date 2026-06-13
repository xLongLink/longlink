from fastapi import Depends, HTTPException
from src.auth import authadmin, authsupport
from src.database.models.users import User
from src.database.services.storage import storage
from src.router import router
from src.models.storage import StorageRegistryCreate, StorageRegistryResponse


@router.get("/api/storage", response_model=list[StorageRegistryResponse])
async def list_storage_registries(_user: User = Depends(authsupport)) -> list[StorageRegistryResponse]:
    """Return all registered storage backends."""

    return await storage.list()


@router.get("/api/storage/{registry_id}", response_model=StorageRegistryResponse)
async def get_storage_registry(registry_id: str, _user: User = Depends(authsupport)) -> StorageRegistryResponse:
    """Return one storage backend registration."""

    registry = await storage.get(registry_id)
    if registry is None:
        raise HTTPException(status_code=404, detail=f"Storage '{registry_id}' not found")

    return registry


@router.post("/api/storage", response_model=StorageRegistryResponse)
async def create_storage_registry(
    payload: StorageRegistryCreate,
    user: User = Depends(authadmin),
) -> StorageRegistryResponse:
    """Create or update one storage backend registration."""

    registry = await storage.create(**payload.model_dump(), user=user)

    return registry


@router.delete("/api/storage/{registry_id}", status_code=204)
async def delete_storage_registry(registry_id: str, user: User = Depends(authadmin)) -> None:
    """Delete one storage backend registration."""

    registry = await storage.delete(registry_id, user.id)
    if registry is None:
        raise HTTPException(status_code=404, detail=f"Storage '{registry_id}' not found")

    return
