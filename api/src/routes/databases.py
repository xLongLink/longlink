from src import adapters
from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authadmin
from src.logger import logger
from src.models.databases import DatabaseRegistryCreate, DatabaseRegistryResponse
from src.database.services import database

router = APIRouter(dependencies=[Depends(authadmin)])


@router.post("/api/databases", response_model=DatabaseRegistryResponse, status_code=201)
async def create_database_registry(payload: DatabaseRegistryCreate):
    """Register one database backend."""

    return await database.create(
        payload.name,
        payload.host,
        payload.port,
        payload.username,
        payload.password,
        payload.sslmode,
    )


@router.get("/api/databases", response_model=list[DatabaseRegistryResponse])
async def list_database_registries():
    """Return all registered database backends."""

    return await database.fetch()


@router.get("/api/databases/{registry_id}", response_model=DatabaseRegistryResponse)
async def get_database_registry(registry_id: UUID):
    """Return one database backend registration."""

    # Resolve the requested database registry.
    registry = await database.get(registry_id)
    if registry is None:
        raise HTTPException(status_code=404, detail="Database registry not found")

    return registry


@router.delete("/api/databases/{registry_id}", status_code=204)
async def delete_database_registry(registry_id: UUID):
    """Delete one unused database backend registration."""

    # Delete only a registry that is not assigned to an Organization.
    if not await database.delete(registry_id):
        raise HTTPException(status_code=404, detail="Database registry not found")


@router.get("/api/databases/{registry_id}/usage", response_model=int)
async def get_database_usage(registry_id: UUID):
    """Query point-in-time storage usage from the live database backend, not persisted desired state.

    The result is diagnostic and depends on backend availability.
    """

    # Resolve the requested database registry before connecting to its backend.
    registry = await database.get(registry_id)
    if registry is None:
        raise HTTPException(status_code=404, detail="Database registry not found")

    # Inspect backend usage through the adapter.
    db = adapters.Postgres(registry.host, registry.port, registry.username, registry.password, registry.sslmode)
    try:
        data = await db.usage()
    except Exception as exc:
        logger.exception("Failed to inspect database usage for registry '%s': %r", registry_id, exc)
        raise HTTPException(status_code=503, detail="Database usage unavailable") from exc

    return data["space_used"]
