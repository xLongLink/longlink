import src.db as db
import botocore
from fastapi import HTTPException
from src.router import router
from src.models.storages import (StorageConnectionCreate,
                                 StorageConnectionDelete,
                                 StorageConnectionResponse,
                                 StorageBucketCreateResponse)


def _bucket_name_from_app_key(app_key: str) -> str:
    normalized = ''.join(character for character in app_key.lower() if character.isalnum() or character == '-')
    normalized = normalized.strip('-')
    if not normalized:
        raise ValueError('App key does not contain valid characters to build a bucket name')

    bucket = f'app-{normalized}'
    return bucket[:63].rstrip('-')


@router.get('/storage')
async def list_storages() -> list[StorageConnectionResponse]:
    connections = await db.storages.list()
    return [
        StorageConnectionResponse(
            name=connection.name,
            endpoint_url=connection.endpoint_url,
            access_key_id=connection.access_key_id,
            region_name=connection.region_name,
        )
        for connection in connections
    ]


@router.post('/storage')
async def set_storage_connection(payload: StorageConnectionCreate) -> StorageConnectionResponse:
    connection = await db.storages.set(
        name=payload.name,
        endpoint_url=payload.endpoint_url,
        access_key_id=payload.access_key_id,
        secret_access_key=payload.secret_access_key,
        region_name=payload.region_name,
    )

    return StorageConnectionResponse(
        name=connection.name,
        endpoint_url=connection.endpoint_url,
        access_key_id=connection.access_key_id,
        region_name=connection.region_name,
    )


@router.delete('/storage')
async def delete_storage_connection(payload: StorageConnectionDelete) -> dict[str, str]:
    deleted = await db.storages.delete(payload.name)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Storage connection '{payload.name}' not found")

    return {'status': 'deleted'}


@router.post('/storage/apps/{app_id}/bucket')
async def create_storage_bucket_for_app(app_id: str, connection_name: str = 'default') -> StorageBucketCreateResponse:
    app = await db.apps.get_by_uuid(app_id)
    if app is None:
        raise HTTPException(status_code=404, detail=f"App '{app_id}' not found")

    connection = await db.storages.get(connection_name)
    if connection is None:
        raise HTTPException(status_code=404, detail=f"Storage connection '{connection_name}' not found")

    try:
        bucket_name = _bucket_name_from_app_key(app.key)
        await db.storages.create_bucket(connection=connection, bucket_name=bucket_name)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except botocore.exceptions.BotoCoreError as error:
        raise HTTPException(status_code=502, detail=f'Unable to create bucket: {str(error)}') from error

    return StorageBucketCreateResponse(
        app_id=app.id,
        app_key=app.key,
        bucket=bucket_name,
        connection_name=connection_name,
    )
