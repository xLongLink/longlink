import src.db as db
from fastapi import HTTPException
from src.apps.organization import (
    notify_app_organization_settings,
    organization_settings_payload,
)
from src.models.apps import AppCreate, AppResponse
from src.router import router
from src.utils import apps, url
from enum import Enum


class AppType(str, Enum):
    tool = 'tool'
    space = 'space'
    process = 'process'


@router.get('/apps')
async def list_apps(type: AppType | None = None) -> list[AppResponse]:
    if type is not None:
        registered_apps = await db.apps.list_by_type(type)
    else:
        registered_apps = await db.apps.list()

    return [
        AppResponse(id=app.id, name=app.name, url=app.url, type=app.type)
        for app in registered_apps
    ]


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
        params={'key': payload.key},
    )
    if not metadata_response.is_success:
        raise HTTPException(
            status_code=400,
            detail=f'Unable to fetch metadata.json ({metadata_response.status_code})',
        )

    try:
        metadata = metadata_response.json()
        app_name = metadata['name']
        app_type = metadata.get('type', 'tool')
    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(
            status_code=400,
            detail='App metadata response is invalid',
        ) from exc

    if app_type not in VALID_APP_TYPES:
        raise HTTPException(
            status_code=400,
            detail='App metadata type must be one of: tool, space, process',
        )

    try:
        app_id = payload.id.strip() if payload.id is not None else None
        if app_id == '':
            app_id = None

        app = await db.apps.create(
            app_name,
            url=app_url,
            key=payload.key,
            app_type=app_type,
            app_id=app_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    organization_payload = await organization_settings_payload()
    await notify_app_organization_settings(app.url, organization_payload)

    return AppResponse(id=app.id, name=app.name, url=app.url, type=app.type)
