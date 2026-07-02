from uuid import UUID
from fastapi import Depends, Response, APIRouter
from src.auth import authadmin, authsupport
from src.utils import names
from src.errors import ConflictError, NotFoundError
from src.models.locations import LocationCreate, LocationResponse
from src.database.models.users import User
from src.database.services.locations import locations

router = APIRouter()


@router.get("/api/locations", response_model=list[LocationResponse])
async def list_locations(_: User = Depends(authsupport)) -> list[LocationResponse]:
    """Return all registered locations."""

    return [LocationResponse.model_validate(location) for location in await locations.list()]


@router.get("/api/locations/{location_id}", response_model=LocationResponse)
async def get_location(location_id: UUID, _: User = Depends(authsupport)) -> LocationResponse:
    """Return one location."""

    location = await locations.get(location_id)
    if location is None:
        raise NotFoundError("Location", location_id)

    return LocationResponse.model_validate(location)


@router.delete("/api/locations/{location_id}", status_code=204)
async def delete_location(location_id: UUID, user: User = Depends(authadmin)) -> Response:
    """Soft-delete one location."""

    try:
        deleted = await locations.delete(location_id, user)
    except ValueError as exc:
        raise ConflictError(str(exc)) from exc

    if not deleted:
        raise NotFoundError("Location", location_id)

    return Response(status_code=204)


@router.post("/api/locations", response_model=LocationResponse)
async def create_location(payload: LocationCreate, user: User = Depends(authadmin)) -> LocationResponse:
    """Create one location."""

    # Surface validation errors as a conflict so the API stays consistent with other create flows.
    try:
        location = await locations.create(names.slugify(payload.name), payload.name, user, payload.country, payload.provider)
    except ValueError as exc:
        raise ConflictError(str(exc)) from exc

    return LocationResponse.model_validate(location)
