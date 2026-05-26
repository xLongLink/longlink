import src.db as db
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import and_, select
from src.auth import authuser
from src.db.models.association import user_apps
from src.db.session import get_session
from src.models.apps import AppCreate, AppName, AppResponse

router = APIRouter(prefix="/api/apps")


@router.get("")
async def list_apps(organization: str, user: db.User = Depends(authuser)) -> list[AppResponse]:
    """Return the apps registered in one organization."""

    if all(org.name != organization for org in user.orgs):
        raise HTTPException(status_code=404, detail=f"Org '{organization}' not found")

    Session = await get_session()
    async with Session() as session:
        # Resolve the role directly from the user-app membership row.
        statement = (
            select(db.App, user_apps.c.role_name)
            .outerjoin(
                user_apps,
                and_(
                    db.App.organization == user_apps.c.organization_name,
                    db.App.name == user_apps.c.app_name,
                    user_apps.c.user_id == user.id,
                ),
            )
            .where(db.App.organization == organization)
        )
        result = await session.execute(statement)

        return [
            AppResponse(
                name=app.name,
                url=app.url,
                role=role_name,
            )
            for app, role_name in result.all()
        ]


@router.post("")
async def create_app(organization: str, payload: AppCreate) -> AppResponse:
    """Register a new app in the database."""
    existing_app = await db.apps.get(organization, payload.name)
    if existing_app is not None:
        raise HTTPException(status_code=409, detail="App name already exists")

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

    return AppResponse(name=app.name, url=app.url)


@router.delete("/{app_name}", status_code=204)
async def delete_app(organization: str, app_name: AppName) -> Response:
    """Delete an app registration."""
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
