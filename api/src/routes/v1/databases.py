from uuid import UUID
from fastapi import Depends, APIRouter, HTTPException
from src.auth import authadmin, get_session
from src.logger import logger
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import load_only
from src.environments import env
from src.models.types import DatabaseSSLMode
from src.models.databases import DatabaseRegistryCreate, DatabaseRegistryResponse
from src.adapters.postgres import Postgres
from src.database.services import database
from src.models.pagination import Page, Pagination
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.databases import DatabaseRegistry

router = APIRouter(dependencies=[Depends(authadmin)])


@router.post("/databases", response_model=DatabaseRegistryResponse, status_code=201)
async def create_database_registry(payload: DatabaseRegistryCreate, session: AsyncSession = Depends(get_session)):
    """Register one database backend."""

    # Managed database connections must use TLS outside development.
    if not env.DEVELOPMENT and payload.sslmode == DatabaseSSLMode.disable:
        raise HTTPException(status_code=422, detail="Production databases must use SSL")

    registry = await database.create(session, **payload.model_dump())
    await session.commit()
    return registry


@router.get("/databases", response_model=Page[DatabaseRegistryResponse])
async def list_database_registries(pagination: Pagination = Depends(), session: AsyncSession = Depends(get_session)):
    """Return all registered database backends."""

    items, total = await database.fetch_page(session, pagination)
    return {"items": items, "total": total}


@router.get("/databases/{registry_id}", response_model=DatabaseRegistryResponse)
async def get_database_registry(registry_id: UUID, session: AsyncSession = Depends(get_session)):
    """Return one database backend registration."""

    # Resolve the requested database registry.
    registry = await session.get(
        DatabaseRegistry,
        registry_id,
        options=[
            load_only(
                DatabaseRegistry.id,
                DatabaseRegistry.name,
                DatabaseRegistry.host,
                DatabaseRegistry.port,
                DatabaseRegistry.sslmode,
                DatabaseRegistry.username,
            )
        ],
    )
    if registry is None:
        raise HTTPException(status_code=404, detail="Database registry not found")

    return registry


@router.delete("/databases/{registry_id}", status_code=204)
async def delete_database_registry(registry_id: UUID, session: AsyncSession = Depends(get_session)):
    """Delete one unused database backend registration."""

    # Delete only a registry that is not assigned to an Organization.
    await database.delete(session, registry_id)
    await session.commit()


@router.get("/databases/{registry_id}/usage", response_model=int)
async def get_database_usage(registry_id: UUID, session: AsyncSession = Depends(get_session)):
    """Query point-in-time storage usage from the live database backend, not persisted desired state.

    The result is diagnostic and depends on backend availability.
    """

    # Resolve the requested database registry before connecting to its backend.
    registry = await session.get(DatabaseRegistry, registry_id)
    if registry is None:
        raise HTTPException(status_code=404, detail="Database registry not found")

    # Inspect backend usage through the adapter.
    try:
        database = Postgres(
            registry.host,
            registry.port,
            registry.username,
            registry.password,
            registry.sslmode,
        )
        return await database.usage()
    except OperationalError as exc:
        logger.exception("Failed to inspect database usage for registry '%s'", registry_id)
        raise HTTPException(status_code=503, detail="Database usage unavailable") from exc
