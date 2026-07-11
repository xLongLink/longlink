from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authadmin, authsupport
from src.utils import names
from src.models.locations import LocationCreate, LocationResponse
from src.database.services import locations
from src.database.models.users import User

router = APIRouter()


@router.get("/api/locations", response_model=list[LocationResponse])
async def list_locations(_: User = Depends(authsupport)):
    """Return all registered locations."""

    return await locations.fetch()


@router.get("/api/locations/{location_id}", response_model=LocationResponse)
async def get_location(location_id: UUID, _: User = Depends(authsupport)):
    """Return one location."""

    location = await locations.get(location_id)
    if location is None:
        raise HTTPException(status_code=404, detail="Location not found")

    return location


@router.delete("/api/locations/{location_id}", status_code=204)
async def delete_location(location_id: UUID, user: User = Depends(authadmin)):
    """Soft-delete one location."""

    deleted = await locations.delete(location_id, user)
    if not deleted:
        raise HTTPException(status_code=404, detail="Location not found")


@router.post("/api/locations", response_model=LocationResponse)
async def create_location(payload: LocationCreate, user: User = Depends(authadmin)):
    """Create one location."""

    # Build a stable slug from the submitted name.
    slug = names.slugify(payload.name)

    return await locations.create(slug, payload.name, user, payload.country, payload.provider)
