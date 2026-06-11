from fastapi import Depends
from src.auth import authuser, authadmin
from src.database.models.users import User
from src.database.services.organizations import orgs
from src.models.organizations import OrgCreate, OrgDetails, OrgSummary
from src.routes.common import conflict, not_found
from src.router import router


@router.get("/api/orgs", response_model=list[OrgSummary])
async def list_organizations(_user: User = Depends(authadmin)) -> list[OrgSummary]:
    """Return all organizations for admin views."""

    return await orgs.list()


@router.get("/api/orgs/{name}", response_model=OrgDetails)
async def get_organization(
    name: str,
    user: User = Depends(authuser),
) -> OrgDetails:
    """Return one organization and its metadata."""

    # Deny access early when the org does not exist.
    organization = await orgs.get(name)
    if organization is None:
        raise not_found("Org", name)

    # Keep organization reads scoped to the caller's memberships.
    if not any(org.name == name for org in user.orgs):
        raise not_found("Org", name)

    return organization


@router.post("/api/orgs", response_model=OrgSummary)
async def create_organization(
    payload: OrgCreate,
    user: User = Depends(authuser),
) -> OrgSummary:
    """Create a new org."""

    # Map uniqueness failures to a conflict response.
    try:
        organization = await orgs.create(payload.name, payload.location_id, user)
    except ValueError as exc:
        raise conflict(exc) from exc

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


@router.delete("/api/orgs/{name}", status_code=204)
async def delete_organization(name: str, user: User = Depends(authuser)) -> None:
    """Delete one org by name."""

    # Only members can delete their own org.
    if not any(org.name == name for org in user.orgs):
        raise not_found("Org", name)

    await orgs.delete(name)
    return
