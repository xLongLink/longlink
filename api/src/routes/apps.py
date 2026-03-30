import src.db as db
from fastapi import HTTPException
from src.utils import url, apps
from src.router import router
from src.models.apps import AppCreate, AppResponse
from src.apps.organization import (organization_settings_payload,
                                   notify_app_organization_settings)


@router.get('/apps')
async def list_apps() -> list[AppResponse]:
    """List all registered apps."""
    apps = await db.apps.list()
    return [AppResponse(id=app.id, name=app.name, url=app.url) for app in apps ]


@router.post('/apps')
async def create_app(payload: AppCreate) -> AppResponse:
    """Create a new app."""
    try:
        app_url = url.normalize(payload.url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    metadata_response = await apps.raw(
        f'{app_url.rstrip("/")}/metadata.json',
        method='GET',
        params={'key': payload.token},
    )
    if not metadata_response.is_success:
        raise HTTPException(
            status_code=400,
            detail=f'Unable to fetch metadata.json ({metadata_response.status_code})',
        )

    try:
        metadata = metadata_response.json()
        app_name = metadata['name']
    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(
            status_code=400,
            detail='App metadata response is invalid',
        ) from exc

    try:
        app = await db.apps.create(app_name, url=app_url, token=payload.token)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    organization_payload = await organization_settings_payload()
    await notify_app_organization_settings(app.url, organization_payload)

    return AppResponse(id=app.id, name=app.name, url=app.url)
