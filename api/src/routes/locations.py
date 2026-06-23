from uuid import UUID
from fastapi import Depends
from src.auth import authadmin, authsupport
from src.router import router
from src.errors import ConflictError, NotFoundError
from src.models.locations import LocationCreate, LocationResponse
from src.database.models.users import User
from src.database.services.locations import locations


@router.get("/api/locations", response_model=list[LocationResponse])
async def list_locations(_user: User = Depends(authsupport)) -> list[LocationResponse]:
    """Return all registered locations."""

    return await locations.list()


@router.get("/api/locations/{location_id}", response_model=LocationResponse)
async def get_location(location_id: UUID, _user: User = Depends(authsupport)) -> LocationResponse:
    """Return one location and its attached infrastructure."""

    location = await locations.get(location_id)
    if location is None:
        raise NotFoundError("Location", location_id)

    return location


@router.post("/api/locations", response_model=LocationResponse)
async def create_location(
    payload: LocationCreate,
    user: User = Depends(authadmin),
) -> LocationResponse:
    """Create one location."""

    # Surface validation errors as a conflict so the API stays consistent with other create flows.
    try:
        location = await locations.create(payload.slug, payload.name, user, payload.country)
    except ValueError as exc:
        raise ConflictError(str(exc)) from exc

    return location


@router.delete("/api/locations/{location_id}", status_code=204)
async def delete_location(location_id: UUID, user: User = Depends(authadmin)) -> None:
    """Delete one location."""

    location = await locations.delete(location_id, user.id)
    if location is None:
        raise NotFoundError("Location", location_id)

    return
