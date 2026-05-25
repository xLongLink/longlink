import src.db as db
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from src.auth import authuser
from src.db.models.association import user_organizations
from src.db.session import get_session
from src.models.orgs import OrgCreate
from src.models.roles import RoleName

router = APIRouter(prefix="/api/orgs")


@router.get("/{name}")
async def get_organization(name: str, user: db.User = Depends(authuser)) -> dict:
    """Return one organization and its metadata."""

    organization = await db.orgs.get(name)
    if organization is None or all(org.name != name for org in user.orgs):
        raise HTTPException(status_code=404, detail=f"Org '{name}' not found")

    payload = organization.model_dump()

    # Read roles from the association table so each member carries the org access level.
    Session = await get_session()
    async with Session() as session:
        statement = select(db.User, user_organizations.c.role_name).join(
            user_organizations,
            db.User.id == user_organizations.c.user_id,
        ).where(user_organizations.c.organization_name == name)
        result = await session.execute(statement)
        payload["users"] = [
            {**member.model_dump(), "role": role_name}
            for member, role_name in result.all()
        ]

    return {"org": payload}


@router.post("")
async def create_organization(
    payload: OrgCreate,
    user: db.User = Depends(authuser),
) -> dict:
    """Create a new org."""

    try:
        organization = await db.orgs.create(payload.name, user.id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return {"org": {**organization.model_dump(), "role": RoleName.owner.value}}


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(name: str, user: db.User = Depends(authuser)) -> Response:
    """Delete one org by name."""

    organization = await db.orgs.get(name)
    if organization is None or all(org.name != name for org in user.orgs):
        raise HTTPException(status_code=404, detail=f"Org '{name}' not found")

    await db.orgs.delete(name)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
