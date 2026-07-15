from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authadmin, authsupport
from src.utils import names
from src.models.locations import LocationCreate, LocationResponse, LocationMutationResponse
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


@router.delete("/api/locations/{location_id}", status_code=202, response_model=LocationMutationResponse)
async def delete_location(location_id: UUID, user: User = Depends(authadmin)):
    """Queue teardown of one unused location aggregate."""

    result = await locations.delete(location_id, user)
    if result is None:
        raise HTTPException(status_code=404, detail="Location not found")

    location, operation = result
    return {"location": location, "operation": operation}


@router.post("/api/locations", response_model=LocationMutationResponse, status_code=202)
async def create_location(payload: LocationCreate, user: User = Depends(authadmin)):
    """Create one complete location aggregate and queue provisioning."""

    # Build a stable slug from the submitted name.
    slug = names.slugify(payload.name)
    location, operation = await locations.create(slug, payload, user)
    return {"location": location, "operation": operation}
