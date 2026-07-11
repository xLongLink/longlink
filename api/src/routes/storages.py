from src import adapters
from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authadmin, authsupport
from src.utils import names
from src.logger import logger
from src.models.storages import StorageBucketResponse, StorageObjectResponse, StorageRegistryCreate, StorageRegistryResponse
from src.database.services import storage
from src.database.models.users import User

router = APIRouter()
STORAGE_OBJECT_LIST_LIMIT = 1000


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
async def create_storage_registry(
    payload: StorageRegistryCreate, user: User = Depends(authadmin)
):
    """Create one storage backend registration."""

    # Build a stable slug from the submitted name.
    slug = names.slugify(payload.name)

    registry = await storage.create(**payload.model_dump(), slug=slug, user=user)

    return registry


@router.get("/api/storages/{registry_id}/buckets", response_model=list[StorageBucketResponse])
async def list_storage_buckets(registry_id: UUID, _: User = Depends(authsupport)):
    """List all buckets on a storage backend."""

    registry = await storage.get(registry_id)
    if registry is None:
        raise HTTPException(status_code=404, detail="Storage registry not found")

    storage_adapter = adapters.storage(registry)

    # Inspect backend buckets through the adapter.
    try:
        bucket_names = await storage_adapter.buckets()
    except Exception as exc:
        logger.exception("Failed to inspect storage buckets for registry '%s'", registry_id)
        raise HTTPException(status_code=503, detail="Storage buckets unavailable") from exc

    return [{"name": bucket_name} for bucket_name in bucket_names]


@router.get(
    "/api/storages/{registry_id}/buckets/{bucket_name}/objects",
    response_model=list[StorageObjectResponse],
)
async def list_storage_bucket_objects(
    registry_id: UUID,
    bucket_name: str,
    _: User = Depends(authsupport),
):
    """List object metadata for one storage bucket."""

    registry = await storage.get(registry_id)
    if registry is None:
        raise HTTPException(status_code=404, detail="Storage registry not found")

    storage_adapter = adapters.storage(registry)

    # Inspect backend objects through the adapter.
    try:
        objects = await storage_adapter.objects(bucket_name, limit=STORAGE_OBJECT_LIST_LIMIT)
    except Exception as exc:
        logger.exception(
            "Failed to inspect objects in bucket '%s' for registry '%s'",
            bucket_name,
            registry_id,
        )
        raise HTTPException(status_code=503, detail="Storage objects unavailable") from exc

    return objects
