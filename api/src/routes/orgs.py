import src.db as db
from fastapi import Depends, HTTPException, status
from src.auth import authuser, authadmin
from src.models.orgs import OrgCreate, OrgDetails, OrgSummary
from src.router import router


@router.get("/api/orgs", response_model=list[OrgSummary])
async def list_organizations(_user: db.User = Depends(authadmin)) -> list[OrgSummary]:
    """Return all organizations for admin views."""

    return await db.orgs.list()


@router.get("/api/orgs/{name}", response_model=OrgDetails)
async def get_organization(
    name: str,
    user: db.User = Depends(authuser),
) -> OrgDetails:
    """Return one organization and its metadata."""

    organization = await db.orgs.get(name)
    if organization is None:
        raise HTTPException(status_code=404, detail=f"Org '{name}' not found")

    if not any(org.name == name for org in user.orgs):
        raise HTTPException(status_code=404, detail=f"Org '{name}' not found")

    return organization


@router.post("/api/orgs", response_model=OrgSummary)
async def create_organization(
    payload: OrgCreate,
    user: db.User = Depends(authuser),
) -> OrgSummary:
    """Create a new org."""

    try:
        organization = await db.orgs.create(payload.name, payload.location_id, user)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return {
        "name": organization.name,
        "location_id": organization.location_id,
        "created_at": organization.created_at,
        "updated_at": organization.updated_at,
        "created_by": user,
        "updated_by": user,
        "deleted_at": organization.deleted_at,
        "deleted_by": None,
    }


@router.delete("/api/orgs/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(name: str, user: db.User = Depends(authuser)) -> None:
    """Delete one org by name."""

    if not any(org.name == name for org in user.orgs):
        raise HTTPException(status_code=404, detail=f"Org '{name}' not found")

    await db.orgs.delete(name)
    return
