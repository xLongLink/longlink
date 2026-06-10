from fastapi import Depends, HTTPException, status
from src.auth import authadmin
from src.database.models import User
from src.database.services.storage import storage
from src.models import StorageRegistryCreate, StorageRegistryResponse
from src.router import router


@router.get("/api/storage", response_model=list[StorageRegistryResponse])
async def list_storage_registries(_user: User = Depends(authadmin)) -> list[StorageRegistryResponse]:
    """Return all registered storage backends."""

    return await storage.list()


@router.get("/api/storage/{name}", response_model=StorageRegistryResponse)
async def get_storage_registry(name: str, _user: User = Depends(authadmin)) -> StorageRegistryResponse:
    """Return one storage backend registration."""

    registry = await storage.get(name)
    if registry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Storage '{name}' not found")

    return registry


@router.post("/api/storage", response_model=StorageRegistryResponse)
async def create_storage_registry(
    payload: StorageRegistryCreate,
    _user: User = Depends(authadmin),
) -> StorageRegistryResponse:
    """Create or update one storage backend registration."""

    registry = await storage.create(**payload.model_dump())

    return registry


@router.delete("/api/storage/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_storage_registry(name: str, _user: User = Depends(authadmin)) -> None:
    """Delete one storage backend registration."""

    registry = await storage.delete(name)
    if registry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Storage '{name}' not found")

    return
