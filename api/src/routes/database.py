import src.db as db
from fastapi import Depends, APIRouter, HTTPException, status
from src.auth import authadmin
from src.models import DatabaseRegistryCreate, DatabaseRegistryResponse

router = APIRouter(prefix="/api/database")


@router.get("", response_model=list[DatabaseRegistryResponse])
async def list_database_registries(_user: db.User = Depends(authadmin)) -> list[DatabaseRegistryResponse]:
    """Return all registered database backends."""

    return await db.database.list()


@router.get("/{name}", response_model=DatabaseRegistryResponse)
async def get_database_registry(name: str, _user: db.User = Depends(authadmin)) -> DatabaseRegistryResponse:
    """Return one database backend registration."""

    registry = await db.database.get(name)
    if registry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Database '{name}' not found")

    return registry


@router.post("", response_model=DatabaseRegistryResponse)
async def create_database_registry(
    payload: DatabaseRegistryCreate,
    _user: db.User = Depends(authadmin),
) -> DatabaseRegistryResponse:
    """Create or update one database backend registration."""

    registry = await db.database.create(**payload.model_dump())

    return registry


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_database_registry(name: str, _user: db.User = Depends(authadmin)) -> None:
    """Delete one database backend registration."""

    registry = await db.database.delete(name)
    if registry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Database '{name}' not found")

    return
