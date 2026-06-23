from uuid import UUID
from fastapi import Depends, APIRouter
from src.auth import authadmin, authsupport
from src.errors import NotFoundError
from src.models.storage import StorageRegistryCreate, StorageRegistryResponse
from src.database.models.users import User
from src.database.services.storage import storage

router = APIRouter()


@router.get("/api/storages", response_model=list[StorageRegistryResponse])
async def list_storage_registries(_user: User = Depends(authsupport)) -> list[StorageRegistryResponse]:
    """Return all registered storage backends."""

    return await storage.list()


@router.get("/api/storages/{registry_id}", response_model=StorageRegistryResponse)
async def get_storage_registry(registry_id: UUID, _user: User = Depends(authsupport)) -> StorageRegistryResponse:
    """Return one storage backend registration."""

    registry = await storage.get(registry_id)
    if registry is None:
        raise NotFoundError("Storage registry", registry_id)

    return registry


@router.post("/api/storages", response_model=StorageRegistryResponse)
async def create_storage_registry(
    payload: StorageRegistryCreate,
    user: User = Depends(authadmin),
) -> StorageRegistryResponse:
    """Create or update one storage backend registration."""

    registry = await storage.create(**payload.model_dump(), user=user)

    return registry


@router.delete("/api/storages/{registry_id}", status_code=204)
async def delete_storage_registry(registry_id: UUID, user: User = Depends(authadmin)) -> None:
    """Delete one storage backend registration."""

    registry = await storage.delete(registry_id, user.id)
    if registry is None:
        raise NotFoundError("Storage registry", registry_id)

    return
