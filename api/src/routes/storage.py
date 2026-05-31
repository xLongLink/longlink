import src.db as db
from fastapi import APIRouter, Depends, HTTPException, Response, status
from src.adapters.storage.s3 import Storage as StorageAdapter
from src.auth import authadmin
from src.models import (
    StorageQuotaResponse,
    StorageRegistryCreate,
    StorageRegistryResponse,
    StorageUsageResponse,
)
from src.models.kinds import StorageKind

router = APIRouter(prefix="/api/storage")


@router.get("", response_model=list[StorageRegistryResponse])
async def list_storage_registries(_user: db.User = Depends(authadmin)) -> list[StorageRegistryResponse]:
    """Return all registered storage backends."""

    registries = await db.storage.list()
    payload = [
        StorageRegistryResponse.model_validate(
            {
                "id": registry.id,
                "kind": registry.kind,
                "name": registry.name,
                "protocol": registry.protocol,
                "endpoint_url": registry.endpoint_url,
                "access_key_id": registry.access_key_id,
                "location_id": registry.location_id,
            }
        )
        for registry in registries
    ]

    return payload


@router.get("/{name}/usage", response_model=StorageUsageResponse)
async def get_storage_usage(name: str, _user: db.User = Depends(authadmin)) -> StorageUsageResponse:
    """Return storage usage for one registered backend."""

    registry = await db.storage.get(name)
    if registry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Storage '{name}' not found")

    if registry.kind != StorageKind.s3:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Storage '{name}' is unsupported")

    adapter = StorageAdapter(
        protocol=registry.protocol,
        endpoint_url=registry.endpoint_url,
        access_key_id=registry.access_key_id,
        secret_access_key=registry.secret_access_key,
    )

    return StorageUsageResponse.model_validate(adapter.usage())


@router.get("/{name}/quota", response_model=StorageQuotaResponse)
async def get_storage_quota(name: str, _user: db.User = Depends(authadmin)) -> StorageQuotaResponse:
    """Return storage quota for one registered backend."""

    registry = await db.storage.get(name)
    if registry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Storage '{name}' not found")

    if registry.kind != StorageKind.s3:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Storage '{name}' is unsupported")

    adapter = StorageAdapter(
        protocol=registry.protocol,
        endpoint_url=registry.endpoint_url,
        access_key_id=registry.access_key_id,
        secret_access_key=registry.secret_access_key,
    )

    return StorageQuotaResponse.model_validate(adapter.quota())


@router.get("/{name}", response_model=StorageRegistryResponse)
async def get_storage_registry(name: str, _user: db.User = Depends(authadmin)) -> StorageRegistryResponse:
    """Return one storage backend registration."""

    registry = await db.storage.get(name)
    if registry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Storage '{name}' not found")

    return StorageRegistryResponse.model_validate(
        {
            "id": registry.id,
            "kind": registry.kind,
            "name": registry.name,
            "protocol": registry.protocol,
            "endpoint_url": registry.endpoint_url,
            "access_key_id": registry.access_key_id,
            "location_id": registry.location_id,
        }
    )


@router.post("", response_model=StorageRegistryResponse)
async def create_storage_registry(
    payload: StorageRegistryCreate,
    _user: db.User = Depends(authadmin),
) -> StorageRegistryResponse:
    """Create or update one storage backend registration."""

    registry = await db.storage.create(**payload.model_dump())

    return StorageRegistryResponse.model_validate(
        {
            "id": registry.id,
            "kind": registry.kind,
            "name": registry.name,
            "protocol": registry.protocol,
            "endpoint_url": registry.endpoint_url,
            "access_key_id": registry.access_key_id,
            "location_id": registry.location_id,
        }
    )


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_storage_registry(name: str, _user: db.User = Depends(authadmin)) -> Response:
    """Delete one storage backend registration."""

    registry = await db.storage.delete(name)
    if registry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Storage '{name}' not found")

    return Response(status_code=status.HTTP_204_NO_CONTENT)
