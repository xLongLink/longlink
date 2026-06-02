import src.db as db
from fastapi import Depends, APIRouter, HTTPException, status
from src.auth import authadmin
from src.models import StorageRegistryCreate, StorageRegistryResponse

router = APIRouter(prefix="/api/storage")


@router.get("", response_model=list[StorageRegistryResponse])
async def list_storage_registries(_user: db.User = Depends(authadmin)) -> list[StorageRegistryResponse]:
    """Return all registered storage backends."""

    return await db.storage.list()


@router.get("/{name}", response_model=StorageRegistryResponse)
async def get_storage_registry(name: str, _user: db.User = Depends(authadmin)) -> StorageRegistryResponse:
    """Return one storage backend registration."""

    registry = await db.storage.get(name)
    if registry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Storage '{name}' not found")

    return registry


@router.post("", response_model=StorageRegistryResponse)
async def create_storage_registry(
    payload: StorageRegistryCreate,
    _user: db.User = Depends(authadmin),
) -> StorageRegistryResponse:
    """Create or update one storage backend registration."""

    registry = await db.storage.create(**payload.model_dump())

    return registry


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_storage_registry(name: str, _user: db.User = Depends(authadmin)) -> None:
    """Delete one storage backend registration."""

    registry = await db.storage.delete(name)
    if registry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Storage '{name}' not found")

    return
