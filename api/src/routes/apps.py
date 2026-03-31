import src.db as db
from fastapi import HTTPException
from src.utils import apps
from src.router import router
from src.models.apps import AppType, AppCreate, AppMetadata, AppResponse
from src.apps.organization import (organization_settings_payload,
                                   notify_app_organization_settings)


@router.get('/apps')
async def list_apps(type: AppType | None = None) -> list[AppResponse]:
    """List registered apps, optionally filtered by type."""
    if type is not None:
        registered_apps = await db.apps.list_by_type(type)
    else:
        registered_apps = await db.apps.list()

    return [AppResponse(id=app.id, name=app.name, url=app.url, type=app.type) for app in registered_apps]


@router.post('/apps')
async def create_app(payload: AppCreate) -> AppResponse:
    """Create a new app."""
    metadata_response = await apps.raw(f'{payload.url.rstrip("/")}/metadata.json', "GET")
    if not metadata_response.is_success:
        raise HTTPException( status_code=400, detail=f'Unable to fetch metadata.json ({metadata_response.status_code})')

    try:
        metadata = AppMetadata.model_validate(metadata_response.json())
    except ValueError as exc:
        raise HTTPException(status_code=400,detail='App metadata response is invalid') from exc

    try:
        app = await db.apps.create(
            metadata.name,
            url=payload.url,
            key=payload.key,
            app_type=metadata.type,
            app_id=payload.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    organization_payload = await organization_settings_payload()
    await notify_app_organization_settings(app.url, organization_payload)

    return AppResponse(id=app.id, name=app.name, url=app.url, type=app.type)
