from uuid import UUID
from fastapi import Depends, APIRouter
from src.auth import authadmin, authsupport
from src.errors import ConflictError, NotFoundError
from src.adapters.storage import S3
from src.models.storages import (StorageBucketResponse,
                                StorageObjectResponse,
                                StorageRegistryCreate,
                                StorageRegistryResponse)
from src.database.models.users import User
from src.database.services.storage import storage

router = APIRouter()
STORAGE_OBJECT_LIST_LIMIT = 1000


@router.get("/api/storages", response_model=list[StorageRegistryResponse])
async def list_storage_registries(_: User = Depends(authsupport)) -> list[StorageRegistryResponse]:
    """Return all registered storage backends."""

    return await storage.list()


@router.get("/api/storages/{registry_id}", response_model=StorageRegistryResponse)
async def get_storage_registry(registry_id: UUID, _: User = Depends(authsupport)) -> StorageRegistryResponse:
    """Return one storage backend registration."""

    registry = await storage.get(registry_id)
    if registry is None:
        raise NotFoundError("Storage registry", registry_id)

    return registry


@router.post("/api/storages", response_model=StorageRegistryResponse)
async def create_storage_registry(payload: StorageRegistryCreate, user: User = Depends(authadmin)) -> StorageRegistryResponse:
    """Create or update one storage backend registration."""

    try:
        registry = await storage.create(**payload.model_dump(), user=user)
    except ValueError as exc:
        raise ConflictError(str(exc)) from exc

    return registry


@router.get("/api/storages/{registry_id}/buckets", response_model=list[StorageBucketResponse])
async def list_storage_buckets(registry_id: UUID, _: User = Depends(authsupport)) -> list[StorageBucketResponse]:
    """List all buckets on a storage backend."""

    registry = await storage.get(registry_id)
    if registry is None:
        raise NotFoundError("Storage registry", registry_id)

    s3 = S3(registry.protocol, registry.endpoint_url, registry.access_key_id, registry.secret_access_key)
    names = await s3.buckets()
    return [StorageBucketResponse(name=n) for n in names]


@router.get("/api/storages/{registry_id}/buckets/{bucket_name}/objects", response_model=list[StorageObjectResponse])
async def list_storage_bucket_objects(
    registry_id: UUID,
    bucket_name: str,
    _: User = Depends(authsupport),
) -> list[StorageObjectResponse]:
    """List object metadata for one storage bucket."""

    registry = await storage.get(registry_id)
    if registry is None:
        raise NotFoundError("Storage registry", registry_id)

    s3 = S3(registry.protocol, registry.endpoint_url, registry.access_key_id, registry.secret_access_key)
    objects = await s3.objects(bucket_name, limit=STORAGE_OBJECT_LIST_LIMIT)
    return [StorageObjectResponse(**item) for item in objects]
