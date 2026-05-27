import src.db as db
from fastapi import APIRouter, Depends, HTTPException, Response, status
from src.auth import authadmin
from src.models import APIResponse, StorageRegistryCreate, StorageRegistryResponse

router = APIRouter(prefix="/api/storage")


@router.get("")
async def list_storage_registries(_user: db.User = Depends(authadmin)) -> APIResponse[list[StorageRegistryResponse]]:
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
            }
        )
        for registry in registries
    ]

    return APIResponse(success=True, detail="Storage registries fetched", data=payload)


@router.get("/{name}")
async def get_storage_registry(name: str, _user: db.User = Depends(authadmin)) -> APIResponse[StorageRegistryResponse]:
    """Return one storage backend registration."""

    registry = await db.storage.get(name)
    if registry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Storage '{name}' not found")

    return APIResponse(
        success=True,
        detail="Storage registry fetched",
        data=StorageRegistryResponse.model_validate(
            {
                "id": registry.id,
                "kind": registry.kind,
                "name": registry.name,
                "protocol": registry.protocol,
                "endpoint_url": registry.endpoint_url,
                "access_key_id": registry.access_key_id,
            }
        ),
    )


@router.post("")
async def create_storage_registry(
    payload: StorageRegistryCreate,
    _user: db.User = Depends(authadmin),
) -> APIResponse[StorageRegistryResponse]:
    """Create or update one storage backend registration."""

    registry = await db.storage.create(**payload.model_dump())

    return APIResponse(
        success=True,
        detail="Storage registry saved",
        data=StorageRegistryResponse.model_validate(
            {
                "id": registry.id,
                "kind": registry.kind,
                "name": registry.name,
                "protocol": registry.protocol,
                "endpoint_url": registry.endpoint_url,
                "access_key_id": registry.access_key_id,
            }
        ),
    )


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_storage_registry(name: str, _user: db.User = Depends(authadmin)) -> Response:
    """Delete one storage backend registration."""

    registry = await db.storage.delete(name)
    if registry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Storage '{name}' not found")

    return Response(status_code=status.HTTP_204_NO_CONTENT)
