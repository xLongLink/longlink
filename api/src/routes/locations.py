from uuid import UUID
from fastapi import Depends, APIRouter
from src.auth import authadmin, authsupport
from src.errors import ConflictError, NotFoundError
from src.models.common import SuccessResponse
from src.models.locations import LocationCreate, LocationResponse
from src.database.models.users import User
from src.database.services.locations import locations


router = APIRouter()


@router.get("/api/locations", response_model=list[LocationResponse])
async def list_locations(_: User = Depends(authsupport)) -> list[LocationResponse]:
    """Return all registered locations."""

    return await locations.list()


@router.get("/api/locations/{location_id}", response_model=LocationResponse)
async def get_location(location_id: UUID, _: User = Depends(authsupport)) -> LocationResponse:
    """Return one location."""

    location = await locations.get(location_id)
    if location is None:
        raise NotFoundError("Location", location_id)

    return location


@router.post("/api/locations", response_model=LocationResponse)
async def create_location(payload: LocationCreate,user: User = Depends(authadmin)) -> LocationResponse:
    """Create one location."""

    # Surface validation errors as a conflict so the API stays consistent with other create flows.
    try:
        location = await locations.create(payload.slug, payload.name, user, payload.country, payload.provider)
    except ValueError as exc:
        raise ConflictError(str(exc)) from exc

    return location


@router.delete("/api/locations/{location_id}", response_model=SuccessResponse)
async def delete_location(location_id: UUID, user: User = Depends(authadmin)) -> SuccessResponse:
    """Delete one location."""

    location = await locations.delete(location_id, user.id)
    if location is None:
        raise NotFoundError("Location", location_id)

    return SuccessResponse()
