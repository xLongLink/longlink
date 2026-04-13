import src.db as db
import botocore
from fastapi import HTTPException
from src.router import router
from src.models.storages import StorageBucketCreateResponse


def _bucket_name_from_app_key(app_key: str) -> str:
    normalized = ''.join(character for character in app_key.lower() if character.isalnum() or character == '-')
    normalized = normalized.strip('-')
    if not normalized:
        raise ValueError('App key does not contain valid characters to build a bucket name')

    bucket = f'app-{normalized}'
    return bucket[:63].rstrip('-')


@router.post('/storage/apps/{app_id}/bucket')
async def create_storage_bucket_for_app(app_id: str) -> StorageBucketCreateResponse:
    app = await db.apps.get_by_uuid(app_id)
    if app is None:
        raise HTTPException(status_code=404, detail=f"App '{app_id}' not found")

    try:
        bucket_name = _bucket_name_from_app_key(app.key)
        await db.storages.create_bucket(bucket_name=bucket_name)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except botocore.exceptions.BotoCoreError as error:
        raise HTTPException(status_code=502, detail=f'Unable to create bucket: {str(error)}') from error

    return StorageBucketCreateResponse(
        app_id=app.id,
        app_key=app.key,
        bucket=bucket_name,
    )
