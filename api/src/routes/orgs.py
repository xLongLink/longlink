import src.db as db
from fastapi import APIRouter, Depends, HTTPException, Response, status
from src.auth import authadmin, authuser
from src.models.orgs import OrgAppResponse, OrgCreate, OrgDetails, OrgSummary
from src.models.users import UserSummary

router = APIRouter(prefix="/api/orgs")


@router.get("", response_model=list[OrgSummary])
async def list_organizations(_user: db.User = Depends(authadmin)) -> list[OrgSummary]:
    """Return all organizations for admin views."""

    organizations = await db.orgs.list()
    payload = [
        # Map optional audit relations directly so missing values stay null.
        OrgSummary.model_validate(
            {
                "name": organization.name,
                "created_at": organization.created_at,
                "updated_at": organization.updated_at,
                "created_by": (
                    UserSummary.model_validate(organization.created_by.model_dump()) if organization.created_by else None
                ),
                "updated_by": (
                    UserSummary.model_validate(organization.updated_by.model_dump()) if organization.updated_by else None
                ),
                "deleted_at": organization.deleted_at,
                "deleted_by": (
                    UserSummary.model_validate(organization.deleted_by.model_dump()) if organization.deleted_by else None
                ),
            }
        )
        for organization in organizations
    ]

    return payload


@router.get("/{name}", response_model=OrgDetails)
async def get_organization(
    name: str,
    user: db.User = Depends(authuser),
) -> OrgDetails:
    """Return one organization and its metadata."""

    organization = await db.orgs.get(name)
    if organization is None:
        raise HTTPException(status_code=404, detail=f"Org '{name}' not found")

    if all(org.name != name for org in user.orgs):
        raise HTTPException(status_code=404, detail=f"Org '{name}' not found")

    # Load the org apps separately so the detail payload includes the organization inventory.
    apps = await db.apps.list(name, user.id)
    members = await db.orgs.members(name)
    app_payloads: list[OrgAppResponse] = []

    # Build nested app payloads from the loaded audit relations.
    for app, _role_name in apps:
        app_payloads.append(
            OrgAppResponse.model_validate(
                {
                    **app.model_dump(),
                    "created_by": UserSummary.model_validate(app.created_by.model_dump()) if app.created_by else None,
                    "updated_by": UserSummary.model_validate(app.updated_by.model_dump()) if app.updated_by else None,
                    "deleted_by": UserSummary.model_validate(app.deleted_by.model_dump()) if app.deleted_by else None,
                }
            )
        )

    return OrgDetails(
        name=organization.name,
        created_at=organization.created_at,
        updated_at=organization.updated_at,
        created_by=UserSummary.model_validate(organization.created_by.model_dump()) if organization.created_by else None,
        updated_by=UserSummary.model_validate(organization.updated_by.model_dump()) if organization.updated_by else None,
        deleted_at=organization.deleted_at,
        deleted_by=UserSummary.model_validate(organization.deleted_by.model_dump()) if organization.deleted_by else None,
        users=[UserSummary.model_validate(member.model_dump()) for member, _role_name in members],
        apps=app_payloads,
    )


@router.post("", response_model=OrgSummary)
async def create_organization(
    payload: OrgCreate,
    user: db.User = Depends(authuser),
) -> OrgSummary:
    """Create a new org."""

    try:
        organization = await db.orgs.create(payload.name, user)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return OrgSummary(
        name=organization.name,
        created_at=organization.created_at,
        updated_at=organization.updated_at,
        created_by=UserSummary.model_validate(user.model_dump()),
        updated_by=UserSummary.model_validate(user.model_dump()),
        deleted_at=organization.deleted_at,
        deleted_by=None,
    )


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(name: str, user: db.User = Depends(authuser)) -> Response:
    """Delete one org by name."""

    organization = await db.orgs.get(name)
    if organization is None or all(org.name != name for org in user.orgs):
        raise HTTPException(status_code=404, detail=f"Org '{name}' not found")

    await db.orgs.delete(name)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
