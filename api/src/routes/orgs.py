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

    # Resolve audit names once so the response can embed user objects instead of raw strings.
    audit_names: set[str] = set()
    for value in (organization.created_by, organization.updated_by, organization.deleted_by):
        if value:
            audit_names.add(value)
    for app, _role_name in apps:
        for value in (app.created_by, app.updated_by, app.deleted_by):
            if value:
                audit_names.add(value)

    audit_users: dict[str, UserSummary] = {}
    for audit_name in audit_names:
        audit_user = await db.users.get_by_name(audit_name)
        if audit_user is not None:
            audit_users[audit_name] = UserSummary.model_validate(audit_user.model_dump())

    created_by_user = audit_users.get(organization.created_by) or UserSummary.model_validate(user.model_dump())
    updated_by_user = audit_users.get(organization.updated_by) or created_by_user
    deleted_by_user = audit_users.get(organization.deleted_by) or updated_by_user
    app_payloads: list[OrgAppResponse] = []

    for app, _role_name in apps:
        app_created_by = audit_users.get(app.created_by) or created_by_user
        app_updated_by = audit_users.get(app.updated_by) or app_created_by
        app_deleted_by = audit_users.get(app.deleted_by) or app_updated_by
        app_payloads.append(
            OrgAppResponse.model_validate(
                {
                    **app.model_dump(),
                    "created_by": app_created_by,
                    "updated_by": app_updated_by,
                    "deleted_by": app_deleted_by,
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
            created_by=created_by_user,
            updated_by=updated_by_user,
            deleted_at=organization.deleted_at,
            deleted_by=deleted_by_user,
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
        await db.orgs.create(payload.name, user.id)
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
