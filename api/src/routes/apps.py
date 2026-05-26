import src.db as db
from fastapi import APIRouter, Depends, HTTPException, Response, status
from src.auth import authuser
from src.models import APIResponse
from src.models.apps import AppCreate, AppName, AppResponse

router = APIRouter(prefix="/api/apps")


@router.get("")
async def list_apps(organization: str, user: db.User = Depends(authuser)) -> APIResponse[list[AppResponse]]:
    """Return the apps registered in one organization."""

    if all(org.name != organization for org in user.orgs):
        raise HTTPException(status_code=404, detail=f"Org '{organization}' not found")

    apps = await db.apps.list(organization, user.id)

    return APIResponse(
        success=True,
        detail="Apps fetched",
        data=[
            AppResponse(
                name=app.name,
                url=app.url,
                role=role_name,
            )
            for app, role_name in apps
        ],
    )


@router.post("")
async def create_app(organization: str, payload: AppCreate) -> APIResponse[AppResponse]:
    """Register a new app in the database."""
    app_url = f"/api/apps/{payload.name}"

    try:
        app = await db.apps.create(
            organization,
            payload.name,
            url=app_url,
            image=payload.image,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return APIResponse(
        success=True,
        detail="App created",
        data=AppResponse(name=app.name, url=app.url),
    )


@router.delete("/{app_name}", status_code=204)
async def delete_app(organization: str, app_name: AppName) -> Response:
    """Delete an app registration."""

    try:
        await db.apps.delete(organization, app_name)
    except ValueError as exc:
        detail = str(exc)
        if detail == "App not found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail) from exc

        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail) from exc

    return Response(status_code=status.HTTP_204_NO_CONTENT)
