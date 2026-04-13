import src.db as db
import botocore
from fastapi import HTTPException
from src.router import router
from src.models.storages import (StorageUsageSummary, StorageConfigSummary,
                                 StorageSummaryResponse,
                                 StorageBucketCreateResponse)


def _bucket_name_from_app_key(app_key: str) -> str:
    normalized = ''.join(character for character in app_key.lower() if character.isalnum() or character == '-')
    normalized = normalized.strip('-')
    if not normalized:
        raise ValueError('App key does not contain valid characters to build a bucket name')

    bucket = f'app-{normalized}'
    return bucket[:63].rstrip('-')


@router.get('/storage')
async def get_storage_summary() -> StorageSummaryResponse:
    try:
        config = db.storages.get_config()
    except ValueError:
        return StorageSummaryResponse(configured=False)

    usage = StorageUsageSummary()
    try:
        measured = await db.storages.usage()
        usage = StorageUsageSummary(
            used_bytes=measured.used_bytes,
            free_bytes=measured.free_bytes,
            bucket_count=measured.bucket_count,
        )
    except (ValueError, botocore.exceptions.BotoCoreError):
        usage = StorageUsageSummary()

    return StorageSummaryResponse(
        configured=True,
        config=StorageConfigSummary(
            endpoint_url=config.endpoint_url,
            access_key_id=config.access_key_id,
            region_name=config.region_name,
        ),
        usage=usage,
    )


@router.post('/storage/apps/{app_id}/bucket')
async def create_storage_bucket_for_app(app_id: str) -> StorageBucketCreateResponse:
    app = await db.apps.get_by_uuid(app_id)
    if app is None:
        raise HTTPException(status_code=404, detail=f"App '{app_id}' not found")

    try:
        bucket_name = _bucket_name_from_app_key(app.key)
        await db.storages.create_bucket(bucket_name=bucket_name)
    except ValueError as error:
        detail = str(error)
        status_code = 400
        if 'not configured' in detail:
            status_code = 503
        raise HTTPException(status_code=status_code, detail=detail) from error
    except botocore.exceptions.BotoCoreError as error:
        raise HTTPException(status_code=502, detail=f'Unable to create bucket: {str(error)}') from error

    return StorageBucketCreateResponse(
        app_id=app.id,
        app_key=app.key,
        bucket=bucket_name,
    )
