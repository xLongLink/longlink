import src.db as db
from fastapi import Depends, Response, APIRouter, HTTPException
from src.auth import authuser
from src.models.apps import AppCreate, AppResponse

router = APIRouter(prefix="/api/apps")


@router.get("")
async def list_apps(organization: str, _: db.User = Depends(authuser)) -> list[dict]:
    """Return the apps registered in one organization."""

    apps = await db.apps.list(organization)
    return [AppResponse(name=app.name, url=app.url).model_dump() for app in apps]


@router.post("")
async def create_app(organization: str, payload: AppCreate) -> AppResponse:
    """Register a new app in the database."""
    app_name = payload.name.strip().lower()

    existing_app = await db.apps.get(organization, app_name)
    if existing_app is not None:
        raise HTTPException(status_code=409, detail="App name already exists")

    app_url = f"/api/apps/{app_name}"

    try:
        app = await db.apps.create(
            organization,
            app_name,
            url=app_url,
            image=payload.image,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return AppResponse(name=app.name, url=app.url)


@router.delete("/{app_name}", status_code=204)
async def delete_app(organization: str, app_name: str) -> Response:
    """Delete an app registration."""
    app_name = app_name.strip().lower()
    app = await db.apps.get(organization, app_name)
    if app is None:
        raise HTTPException(status_code=404, detail="App not found")

    try:
        deleted_app = await db.apps.delete(organization, app.name)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    if deleted_app is None:
        raise HTTPException(status_code=404, detail="App not found")

    return Response(status_code=204)
