import src.db as db
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import and_, select
from src.auth import authuser
from src.db.models.association import user_apps, user_organizations
from src.db.session import get_session
from src.models.apps import AppCreate, AppName, AppResponse
from src.models.roles import RoleName

router = APIRouter(prefix="/api/apps")


@router.get("")
async def list_apps(organization: str, user: db.User = Depends(authuser)) -> list[dict]:
    """Return the apps registered in one organization."""

    if all(org.name != organization for org in user.orgs):
        raise HTTPException(status_code=404, detail=f"Org '{organization}' not found")

    Session = await get_session()
    async with Session() as session:
        role_order = {role.value: index for index, role in enumerate(RoleName)}

        org_role_statement = select(user_organizations.c.role_name).where(
            user_organizations.c.user_id == user.id,
            user_organizations.c.organization_name == organization,
        )
        org_role = (await session.execute(org_role_statement)).scalar_one_or_none()

        if org_role is None:
            raise HTTPException(status_code=404, detail=f"Org '{organization}' not found")

        org_role_value = org_role.value if hasattr(org_role, 'value') else org_role

        # Resolve any app-specific overrides and fall back to the organization role.
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
            # Clamp app access to the organization role so app-level grants never exceed org access.
            AppResponse(
                name=app.name,
                url=app.url,
                role=(
                    role_name
                    if role_name is not None
                    and role_order[role_name.value if hasattr(role_name, 'value') else role_name] <= role_order[org_role_value]
                    else org_role
                ),
            ).model_dump()
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
