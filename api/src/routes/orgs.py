import src.db as db
from fastapi import Depends, APIRouter, HTTPException, status
from src.auth import authuser, authadmin
from src.models.orgs import OrgCreate, OrgDetails, OrgSummary

router = APIRouter(prefix="/api/orgs")


@router.get("", response_model=list[OrgSummary])
async def list_organizations(_user: db.User = Depends(authadmin)) -> list[OrgSummary]:
    """Return all organizations for admin views."""

    return await db.orgs.list()


@router.get("/{name}", response_model=OrgDetails)
async def get_organization(
    name: str,
    user: db.User = Depends(authuser),
) -> OrgDetails:
    """Return one organization and its metadata."""

    organization = await db.orgs.get(name)
    if organization is None:
        raise HTTPException(status_code=404, detail=f"Org '{name}' not found")

    org_names = {org.name for org in user.orgs}
    if name not in org_names:
        raise HTTPException(status_code=404, detail=f"Org '{name}' not found")

    # Load the org apps separately so the detail payload includes the organization inventory.
    apps = await db.apps.list(name, user.id)
    members = await db.orgs.members(name)
    app_payloads = [
        {
            **app.model_dump(),
            "created_by": app.created_by,
            "updated_by": app.updated_by,
            "deleted_by": app.deleted_by,
        }
        for app, _role_name in apps
    ]

    location = await db.locations.get(organization.location_id) if organization.location_id else None

    return {
        "name": organization.name,
        "location_id": organization.location_id,
        "location": location,
        "created_at": organization.created_at,
        "updated_at": organization.updated_at,
        "created_by": organization.created_by,
        "updated_by": organization.updated_by,
        "deleted_at": organization.deleted_at,
        "deleted_by": organization.deleted_by,
        "users": [member for member, _role_name in members],
        "apps": app_payloads,
    }


@router.post("", response_model=OrgSummary)
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


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(name: str, user: db.User = Depends(authuser)) -> None:
    """Delete one org by name."""

    organization = await db.orgs.get(name)
    org_names = {org.name for org in user.orgs}
    if organization is None or name not in org_names:
        raise HTTPException(status_code=404, detail=f"Org '{name}' not found")

    await db.orgs.delete(name)
    return
