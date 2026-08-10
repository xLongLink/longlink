from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authadmin, get_auth_session
from src.logger import logger
from src.models.databases import DatabaseRegistryCreate, DatabaseRegistryResponse
from src.adapters.postgres import Postgres
from src.database.services import database
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(dependencies=[Depends(authadmin)])


@router.post("/databases", response_model=DatabaseRegistryResponse, status_code=201)
async def create_database_registry(payload: DatabaseRegistryCreate, session: AsyncSession = Depends(get_auth_session)):
    """Register one database backend."""

    registry = await database.create(
        session,
        payload.name,
        payload.host,
        payload.port,
        payload.username,
        payload.password,
        payload.sslmode,
    )
    await session.commit()
    return registry


@router.get("/databases", response_model=list[DatabaseRegistryResponse])
async def list_database_registries(session: AsyncSession = Depends(get_auth_session)):
    """Return all registered database backends."""

    return await database.fetch(session)


@router.get("/databases/{registry_id}", response_model=DatabaseRegistryResponse)
async def get_database_registry(registry_id: UUID, session: AsyncSession = Depends(get_auth_session)):
    """Return one database backend registration."""

    # Resolve the requested database registry.
    registry = await database.get(session, registry_id)
    if registry is None:
        raise HTTPException(status_code=404, detail="Database registry not found")

    return registry


@router.delete("/databases/{registry_id}", status_code=204)
async def delete_database_registry(registry_id: UUID, session: AsyncSession = Depends(get_auth_session)):
    """Delete one unused database backend registration."""

    # Delete only a registry that is not assigned to an Organization.
    if not await database.delete(session, registry_id):
        raise HTTPException(status_code=404, detail="Database registry not found")
    await session.commit()


@router.get("/databases/{registry_id}/usage", response_model=int)
async def get_database_usage(registry_id: UUID, session: AsyncSession = Depends(get_auth_session)):
    """Query point-in-time storage usage from the live database backend, not persisted desired state.

    The result is diagnostic and depends on backend availability.
    """

    # Resolve the requested database registry before connecting to its backend.
    registry = await database.get(session, registry_id)
    if registry is None:
        raise HTTPException(status_code=404, detail="Database registry not found")

    # Inspect backend usage through the adapter.
    try:
        return await Postgres(registry.host, registry.port, registry.username, registry.password, registry.sslmode).usage()
    except Exception as exc:
        logger.exception("Failed to inspect database usage for registry '%s': %r", registry_id, exc)
        raise HTTPException(status_code=503, detail="Database usage unavailable") from exc
