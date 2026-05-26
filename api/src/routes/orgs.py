import src.db as db
from fastapi import APIRouter, Depends, HTTPException, Response, status
from src.auth import authuser
from src.models import APIResponse
from src.models.orgs import OrgAppResponse, OrgCreate, OrgDetails
from src.models.users import UserSummary

router = APIRouter(prefix="/api/orgs")


@router.get("/{name}")
async def get_organization(
    name: str,
    user: db.User = Depends(authuser),
) -> APIResponse[OrgDetails]:
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
                    "created_by": UserSummary.model_validate((app.created_by or organization.created_by or user).model_dump()),
                    "updated_by": UserSummary.model_validate((app.updated_by or app.created_by or organization.updated_by or user).model_dump()),
                    "deleted_by": UserSummary.model_validate((app.deleted_by or app.updated_by or app.created_by or organization.deleted_by or user).model_dump()),
                }
            )
        )

    return APIResponse(
        success=True,
        detail="Organization fetched",
        data=OrgDetails(
            name=organization.name,
            created_at=organization.created_at,
            updated_at=organization.updated_at,
            created_by=UserSummary.model_validate((organization.created_by or user).model_dump()),
            updated_by=UserSummary.model_validate((organization.updated_by or organization.created_by or user).model_dump()),
            deleted_at=organization.deleted_at,
            deleted_by=UserSummary.model_validate((organization.deleted_by or organization.updated_by or organization.created_by or user).model_dump()),
            users=[UserSummary.model_validate(member.model_dump()) for member, _role_name in members],
            apps=app_payloads,
        ),
    )


@router.post("")
async def create_organization(
    payload: OrgCreate,
    user: db.User = Depends(authuser),
) -> APIResponse[None]:
    """Create a new org."""

    try:
        await db.orgs.create(payload.name, user)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return APIResponse(success=True, detail="Organization created", data=None)


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(name: str, user: db.User = Depends(authuser)) -> Response:
    """Delete one org by name."""

    organization = await db.orgs.get(name)
    if organization is None or all(org.name != name for org in user.orgs):
        raise HTTPException(status_code=404, detail=f"Org '{name}' not found")

    await db.orgs.delete(name)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
