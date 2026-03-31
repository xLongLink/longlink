import src.db as db
from fastapi import HTTPException
from src.utils import url, apps
from src.router import router
from src.models.apps import AppCreate, AppResponse
from src.apps.organization import (organization_settings_payload,
                                   notify_app_organization_settings)


def serialize_app(app: db.App) -> AppResponse:
    return AppResponse(id=app.id, name=app.name, url=app.url, type=app.type)


async def list_apps_by_type(app_type: str) -> list[AppResponse]:
    registered_apps = await db.apps.list_by_type(app_type)
    return [serialize_app(app) for app in registered_apps]


@router.get('/apps')
async def list_apps() -> list[AppResponse]:
    """List all registered apps."""
    registered_apps = await db.apps.list()
    return [serialize_app(app) for app in registered_apps]


@router.get('/tools')
async def list_tools() -> list[AppResponse]:
    """List all tools apps."""
    return await list_apps_by_type('tool')


@router.get('/spaces')
async def list_spaces() -> list[AppResponse]:
    """List all spaces apps."""
    return await list_apps_by_type('space')


@router.get('/processes')
async def list_processes() -> list[AppResponse]:
    """List all processes apps."""
    return await list_apps_by_type('process')


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

    if app_type not in {'tool', 'space', 'process'}:
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

    return serialize_app(app)
