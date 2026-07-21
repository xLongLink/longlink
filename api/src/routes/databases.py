from src import adapters
from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authadmin, authsupport
from src.utils import names
from src.logger import logger
from src.models.databases import DatabaseRegistryCreate, DatabaseRegistryResponse
from src.database.services import database
from src.database.models.users import User

router = APIRouter()


@router.post("/api/databases", response_model=DatabaseRegistryResponse, status_code=201)
async def create_database_registry(payload: DatabaseRegistryCreate, user: User = Depends(authadmin)):
    """Register one database backend."""

    return await database.create(
        payload.name,
        names.slugify(payload.name),
        payload.host,
        payload.port,
        payload.username,
        payload.password,
        user,
    )


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


@router.delete("/api/databases/{registry_id}", response_model=DatabaseRegistryResponse)
async def delete_database_registry(registry_id: UUID, user: User = Depends(authadmin)):
    """Delete one unused database backend registration."""

    registry = await database.delete(registry_id, user)
    if registry is None:
        raise HTTPException(status_code=404, detail="Database registry not found")

    return registry


@router.get("/api/databases/{registry_id}/usage", response_model=int)
async def get_database_usage(registry_id: UUID, _user: User = Depends(authsupport)):
    """Query point-in-time storage usage from the live database backend, not persisted desired state.

    The result is diagnostic and depends on backend availability.
    """

    registry = await database.get(registry_id)
    if registry is None:
        raise HTTPException(status_code=404, detail="Database registry not found")

    # Inspect backend usage through the adapter.
    db = adapters.Postgres(registry.host, registry.port, registry.username, registry.password)
    try:
        data = await db.usage()
    except Exception as exc:
        logger.exception("Failed to inspect database usage for registry '%s': %r", registry_id, exc)
        raise HTTPException(status_code=503, detail="Database usage unavailable") from exc

    return data["space_used"]
