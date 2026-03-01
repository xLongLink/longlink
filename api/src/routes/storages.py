import fsspec
from fastapi import HTTPException

import src.db as db
from src.models.storages import StorageCreate, StorageResponse, StorageUpdate
from src.router import router


def to_response(storage: db.Storage) -> StorageResponse:
    return StorageResponse(
        id=storage.id,
        type=storage.type,
        base_path=storage.base_path,
        options=storage.options,
        connection_url=f'{storage.type}://{storage.base_path}',
    )


def ensure_storage_type_supported(storage_type: str) -> None:
    try:
        fsspec.get_filesystem_class(storage_type)
    except ValueError:
        raise HTTPException(status_code=400, detail='Storage type not supported') from None


@router.get('/storage-types')
async def list_storage_types() -> list[str]:
    return sorted(fsspec.available_protocols())


@router.get('/storages')
async def list_storages() -> list[StorageResponse]:
    storages = await db.storages.list()
    return [to_response(storage) for storage in storages]


@router.post('/storages')
async def create_storage(payload: StorageCreate) -> StorageResponse:
    ensure_storage_type_supported(payload.type)

    storage = await db.storages.create(
        type=payload.type,
        base_path=payload.base_path,
        options=payload.options,
    )
    return to_response(storage)


@router.put('/storages/{storage_id}')
async def edit_storage(storage_id: int, payload: StorageUpdate) -> StorageResponse:
    ensure_storage_type_supported(payload.type)

    storage = await db.storages.update(
        storage_id,
        type=payload.type,
        base_path=payload.base_path,
        options=payload.options,
    )
    if storage is None:
        raise HTTPException(status_code=404, detail='Storage not found')

    return to_response(storage)


@router.delete('/storages/{storage_id}')
async def remove_storage(storage_id: int) -> dict[str, bool]:
    deleted = await db.storages.delete(storage_id)
    if not deleted:
        raise HTTPException(status_code=404, detail='Storage not found')

    return {'deleted': True}
