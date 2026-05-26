import src.db as db
from fastapi import APIRouter, Depends, HTTPException, Response, status
from src.auth import authuser
from src.models import APIResponse
from src.models.orgs import OrgCreate, OrgDetails, OrgMemberResponse

router = APIRouter(prefix="/api/orgs")


@router.get("/{name}")
async def get_organization(
    name: str,
    user: db.User = Depends(authuser),
) -> APIResponse[OrgDetails | list[OrgMemberResponse]]:
    """Return one organization and its metadata."""

    organization = await db.orgs.get(name)
    if organization is None:
        return APIResponse(
            success=True,
            detail=f"Org '{name}' not found",
            data=[],
        )

    if all(org.name != name for org in user.orgs):
        raise HTTPException(status_code=404, detail=f"Org '{name}' not found")

    members = await db.orgs.members(name)
    return APIResponse(
        success=True,
        detail="Organization fetched",
        data=OrgDetails(
            name=organization.name,
            users=[
                OrgMemberResponse.model_validate({**member.model_dump(), "role": role_name})
                for member, role_name in members
            ],
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
