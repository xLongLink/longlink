from fastapi import Depends, HTTPException
from src.auth import authadmin
from src.router import router
from src.models.database import (DatabaseRegistryCreate,
                                 DatabaseRegistryResponse)
from src.database.models.users import User
from src.database.services.database import database


@router.get("/api/database", response_model=list[DatabaseRegistryResponse])
async def list_database_registries(_user: User = Depends(authadmin)) -> list[DatabaseRegistryResponse]:
    """Return all registered database backends."""

    return await database.list()


@router.get("/api/database/{name}", response_model=DatabaseRegistryResponse)
async def get_database_registry(name: str, _user: User = Depends(authadmin)) -> DatabaseRegistryResponse:
    """Return one database backend registration."""

    registry = await database.get(name)
    if registry is None:
        raise HTTPException(status_code=404, detail=f"Database '{name}' not found")

    return registry


@router.post("/api/database", response_model=DatabaseRegistryResponse)
async def create_database_registry(
    payload: DatabaseRegistryCreate,
    _user: User = Depends(authadmin),
) -> DatabaseRegistryResponse:
    """Create or update one database backend registration."""

    registry = await database.create(**payload.model_dump())

    return registry


@router.delete("/api/database/{name}", status_code=204)
async def delete_database_registry(name: str, user: User = Depends(authadmin)) -> None:
    """Mark one database backend registration as deleted."""

    registry = await database.delete(name, user.id)
    if registry is None:
        raise HTTPException(status_code=404, detail=f"Database '{name}' not found")

    return
