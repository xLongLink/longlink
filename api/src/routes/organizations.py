import src.db as db
from fastapi import Response, APIRouter, HTTPException, status
from src.models.organizations import OrganizationCreate

router = APIRouter(prefix="/api/organizations")


@router.get("/{name}")
async def get_organization(name: str) -> dict:
    """Return one organization and its metadata."""

    organization = await db.organizations.get(name)
    if organization is None:
        raise HTTPException(status_code=404, detail=f"Organization '{name}' not found")

    payload = organization.model_dump()
    payload["users"] = [user.model_dump() for user in organization.users]
    return {"organization": payload}


@router.post("")
async def create_organization(payload: OrganizationCreate) -> dict:
    """Create a new organization."""

    try:
        organization = await db.organizations.create(payload.name)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return {"organization": organization.model_dump()}


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(name: str) -> Response:
    """Delete one organization by name."""

    organization = await db.organizations.get(name)
    if organization is None:
        raise HTTPException(status_code=404, detail=f"Organization '{name}' not found")

    await db.organizations.delete(name)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
