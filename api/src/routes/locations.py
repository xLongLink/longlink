from uuid import UUID
from fastapi import Depends, Response, APIRouter
from src.auth import authadmin, authsupport
from src.utils import names
from src.errors import NotFoundError, ConflictError
from src.models.locations import LocationCreate, LocationResponse
from src.database.models.users import User
from src.database.models.locations import Location
from src.database.services import locations

router = APIRouter()


@router.get("/api/locations", response_model=list[LocationResponse])
async def list_locations(_: User = Depends(authsupport)) -> list[Location]:
    """Return all registered locations."""

    return await locations.fetch_all()


@router.get("/api/locations/{location_id}", response_model=LocationResponse)
async def get_location(location_id: UUID, _: User = Depends(authsupport)) -> Location:
    """Return one location."""

    location = await locations.get(location_id)
    if location is None:
        raise NotFoundError("Location", location_id)

    return location


@router.delete("/api/locations/{location_id}", status_code=204)
async def delete_location(location_id: UUID, user: User = Depends(authadmin)) -> Response:
    """Soft-delete one location."""

    deleted = await locations.delete(location_id, user)
    if not deleted:
        raise NotFoundError("Location", location_id)

    return Response(status_code=204)


@router.post("/api/locations", response_model=LocationResponse)
async def create_location(payload: LocationCreate, user: User = Depends(authadmin)) -> Location:
    """Create one location."""

    try:
        slug = names.slugify(payload.name)
    except ValueError as exc:
        raise ConflictError(str(exc)) from exc

    return await locations.create(slug, payload.name, user, payload.country, payload.provider)
