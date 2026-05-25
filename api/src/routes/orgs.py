import src.db as db
from fastapi import APIRouter, Depends, HTTPException, Response, status
from src.auth import authuser
from src.models.orgs import OrgCreate

router = APIRouter(prefix="/api/orgs")


@router.get("/{name}")
async def get_organization(name: str, user: db.User = Depends(authuser)) -> dict:
    """Return one organization and its metadata."""

    organization = await db.orgs.get(name)
    if organization is None or all(org.name != name for org in user.orgs):
        raise HTTPException(status_code=404, detail=f"Org '{name}' not found")

    payload = organization.model_dump()
    payload["users"] = [user.model_dump() for user in organization.users]
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

    return {"org": organization.model_dump()}


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(name: str, user: db.User = Depends(authuser)) -> Response:
    """Delete one org by name."""

    organization = await db.orgs.get(name)
    if organization is None or all(org.name != name for org in user.orgs):
        raise HTTPException(status_code=404, detail=f"Org '{name}' not found")

    await db.orgs.delete(name)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
