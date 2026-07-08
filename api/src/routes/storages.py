from uuid import UUID
from fastapi import Depends, Response, APIRouter
from src.auth import authadmin, authsupport
from src import adapters
from src.utils import names, buckets
from src.logger import logger
from src.errors import ConflictError, NotFoundError, UnavailableError
from src.models.storages import (
    StorageBucketResponse,
    StorageObjectResponse,
    StorageRegistryCreate,
    StorageRegistryResponse,
)
from src.adapters.storage.base import StorageObjectData
from src.database.models.users import User
from src.database.models.storages import StorageRegistry
from src.database.services import storage

router = APIRouter()
MANAGED_STORAGE_BUCKET_PREFIX = f"{buckets.STORAGE_BUCKET_PREFIX}-"
STORAGE_OBJECT_LIST_LIMIT = 1000


def _managed_storage_bucket(bucket_name: str) -> bool:
    """Return whether a bucket name follows the LongLink managed bucket convention."""

    return bucket_name.startswith(MANAGED_STORAGE_BUCKET_PREFIX)


@router.get("/api/storages", response_model=list[StorageRegistryResponse])
async def list_storage_registries(_: User = Depends(authsupport)) -> list[StorageRegistry]:
    """Return all registered storage backends."""

    registries = await storage.fetch_all()
    return registries


@router.get("/api/storages/{registry_id}", response_model=StorageRegistryResponse)
async def get_storage_registry(registry_id: UUID, _: User = Depends(authsupport)) -> StorageRegistry:
    """Return one storage backend registration."""

    registry = await storage.get(registry_id)
    if registry is None:
        raise NotFoundError("Storage registry", registry_id)

    return registry


@router.delete("/api/storages/{registry_id}", status_code=204)
async def delete_storage_registry(registry_id: UUID, user: User = Depends(authadmin)) -> Response:
    """Soft-delete one storage backend registration."""

    deleted = await storage.delete(registry_id, user)

    if not deleted:
        raise NotFoundError("Storage registry", registry_id)

    return Response(status_code=204)


@router.post("/api/storages", response_model=StorageRegistryResponse)
async def create_storage_registry(
    payload: StorageRegistryCreate, user: User = Depends(authadmin)
) -> StorageRegistry:
    """Create one storage backend registration."""

    try:
        slug = names.slugify(payload.name)
    except ValueError as exc:
        raise ConflictError(str(exc)) from exc

    registry = await storage.create(**payload.model_dump(), slug=slug, user=user)

    return registry


@router.get("/api/storages/{registry_id}/buckets", response_model=list[StorageBucketResponse])
async def list_storage_buckets(registry_id: UUID, _: User = Depends(authsupport)) -> list[dict[str, str]]:
    """List all buckets on a storage backend."""

    registry = await storage.get(registry_id)
    if registry is None:
        raise NotFoundError("Storage registry", registry_id)

    storage_adapter = adapters.storage(registry)
    try:
        names = [name for name in await storage_adapter.buckets() if _managed_storage_bucket(name)]
    except Exception as exc:
        logger.exception("Failed to inspect storage buckets for registry '%s'", registry_id)
        raise UnavailableError("Storage buckets unavailable") from exc

    return [{"name": name} for name in names]


@router.get(
    "/api/storages/{registry_id}/buckets/{bucket_name}/objects",
    response_model=list[StorageObjectResponse],
)
async def list_storage_bucket_objects(
    registry_id: UUID,
    bucket_name: str,
    _: User = Depends(authsupport),
) -> list[StorageObjectData]:
    """List object metadata for one storage bucket."""

    registry = await storage.get(registry_id)
    if registry is None:
        raise NotFoundError("Storage registry", registry_id)

    if not _managed_storage_bucket(bucket_name):
        raise NotFoundError("Storage bucket", bucket_name)

    storage_adapter = adapters.storage(registry)
    try:
        objects = await storage_adapter.objects(bucket_name, limit=STORAGE_OBJECT_LIST_LIMIT)
    except Exception as exc:
        logger.exception(
            "Failed to inspect objects in bucket '%s' for registry '%s'",
            bucket_name,
            registry_id,
        )
        raise UnavailableError("Storage objects unavailable") from exc

    return objects
