from fastapi import Depends, HTTPException, status
from src.auth import authadmin
from src.database.models import User
from src.database.services.locations import locations
from src.models.locations import LocationCreate, LocationResponse
from src.router import router


@router.get("/api/locations", response_model=list[LocationResponse])
async def list_locations(_user: User = Depends(authadmin)) -> list[LocationResponse]:
    """Return all registered locations."""

    return await locations.list()


@router.get("/api/locations/{location_id}", response_model=LocationResponse)
async def get_location(location_id: int, _user: User = Depends(authadmin)) -> LocationResponse:
    """Return one location and its attached infrastructure."""

    location = await locations.get(location_id)
    if location is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Location '{location_id}' not found")

    return location


@router.post("/api/locations", response_model=LocationResponse)
async def create_location(
    payload: LocationCreate,
    _user: User = Depends(authadmin),
) -> LocationResponse:
    """Create one location."""

    try:
        location = await locations.create(payload.name, payload.display_name, payload.country)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return location


@router.delete("/api/locations/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(location_id: int, _user: User = Depends(authadmin)) -> None:
    """Delete one location."""

    location = await locations.delete(location_id)
    if location is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Location '{location_id}' not found")

    return
