from src import adapters
from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authsupport
from src.logger import logger
from src.models.databases import DatabaseRegistryResponse
from src.database.services import database
from src.database.models.users import User

router = APIRouter()


@router.get("/api/databases", response_model=list[DatabaseRegistryResponse])
async def list_database_registries(_user: User = Depends(authsupport)):
    """Return all registered database backends."""

    return await database.fetch()


@router.get("/api/databases/{registry_id}", response_model=DatabaseRegistryResponse)
async def get_database_registry(registry_id: UUID, _user: User = Depends(authsupport)):
    """Return one database backend registration."""

    registry = await database.get(registry_id)
    if registry is None:
        raise HTTPException(status_code=404, detail="Database registry not found")

    return registry


@router.get("/api/databases/{registry_id}/usage", response_model=int)
async def get_database_usage(registry_id: UUID, _user: User = Depends(authsupport)):
    """Return used storage bytes for one database backend."""

    registry = await database.get(registry_id)
    if registry is None:
        raise HTTPException(status_code=404, detail="Database registry not found")

    db = adapters.database(registry)

    # Inspect backend usage through the adapter.
    try:
        data = await db.usage()
    except Exception as exc:
        logger.exception("Failed to inspect database usage for registry '%s': %r", registry_id, exc)
        raise HTTPException(status_code=503, detail="Database usage unavailable") from exc

    return data["space_used"]
