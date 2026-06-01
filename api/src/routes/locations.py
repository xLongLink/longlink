import src.db as db
from fastapi import Depends, APIRouter, HTTPException, status
from src.auth import authadmin
from src.models.locations import LocationCreate, LocationResponse

router = APIRouter(prefix="/api/locations")


@router.get("", response_model=list[LocationResponse])
async def list_locations(_user: db.User = Depends(authadmin)) -> list[LocationResponse]:
    """Return all registered locations."""

    return await db.locations.list()


@router.post("", response_model=LocationResponse)
async def create_location(
    payload: LocationCreate,
    _user: db.User = Depends(authadmin),
) -> LocationResponse:
    """Create one location."""

    try:
        location = await db.locations.create(payload.name, payload.display_name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return location


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(location_id: int, _user: db.User = Depends(authadmin)) -> None:
    """Delete one location."""

    location = await db.locations.delete(location_id)
    if location is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Location '{location_id}' not found")

    return
