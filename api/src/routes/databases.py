from uuid import UUID
from fastapi import Depends, Response, APIRouter, HTTPException
from src.auth import authadmin, authsupport
from src import adapters
from src.utils import names
from src.logger import logger
from src.models.databases import (
    DatabaseUsageResponse,
    DatabaseRegistryCreate,
    DatabaseSchemaResponse,
    DatabaseDatabaseResponse,
    DatabaseRegistryResponse,
)
from src.database.models.users import User
from src.database.models.databases import DatabaseRegistry
from src.database.services import database

router = APIRouter()


@router.get("/api/databases", response_model=list[DatabaseRegistryResponse])
async def list_database_registries(_user: User = Depends(authsupport)) -> list[DatabaseRegistry]:
    """Return all registered database backends."""

    registries = await database.fetch_all()
    return registries


@router.get("/api/databases/{registry_id}", response_model=DatabaseRegistryResponse)
async def get_database_registry(registry_id: UUID, _: User = Depends(authsupport)) -> DatabaseRegistry:
    """Return one database backend registration."""

    registry = await database.get(registry_id)

    # Require an existing active registry.
    if registry is None:
        raise HTTPException(status_code=404, detail=f"Database registry '{registry_id}' not found")

    return registry


@router.delete("/api/databases/{registry_id}", status_code=204)
async def delete_database_registry(registry_id: UUID, user: User = Depends(authadmin)) -> Response:
    """Soft-delete one database backend registration."""

    deleted = await database.delete(registry_id, user)

    # Report missing registries as not found.
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Database registry '{registry_id}' not found")

    return Response(status_code=204)


@router.post("/api/databases", response_model=DatabaseRegistryResponse)
async def create_database_registry(
    payload: DatabaseRegistryCreate, user: User = Depends(authadmin)
) -> DatabaseRegistry:
    """Create one database backend registration."""

    # Build a stable slug from the submitted name.
    try:
        slug = names.slugify(payload.name)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail="Invalid database registry name") from exc

    registry = await database.create(**payload.model_dump(), slug=slug, user=user)

    return registry


@router.get(
    "/api/databases/{registry_id}/databases",
    response_model=list[DatabaseDatabaseResponse],
)
async def list_database_databases(registry_id: UUID, _: User = Depends(authsupport)) -> list[dict[str, str]]:
    """List all databases on a database backend."""

    registry = await database.get(registry_id)

    # Require an existing active registry.
    if registry is None:
        raise HTTPException(status_code=404, detail=f"Database registry '{registry_id}' not found")

    database_adapter = adapters.database(registry)

    # Inspect backend databases through the adapter.
    try:
        database_names = await database_adapter.databases()
    except Exception as exc:
        logger.exception("Failed to inspect databases for registry '%s'", registry_id)
        raise HTTPException(status_code=503, detail="Database resources unavailable") from exc

    return [{"name": database_name} for database_name in database_names]


@router.get(
    "/api/databases/{registry_id}/databases/{database_name}/schemas",
    response_model=list[DatabaseSchemaResponse],
)
async def list_database_schemas(
    registry_id: UUID,
    database_name: str,
    _: User = Depends(authsupport),
) -> list[dict[str, str]]:
    """List all schemas in a database on a database backend."""

    registry = await database.get(registry_id)

    # Require an existing active registry.
    if registry is None:
        raise HTTPException(status_code=404, detail=f"Database registry '{registry_id}' not found")

    database_adapter = adapters.database(registry)

    # Inspect backend schemas through the adapter.
    try:
        schema_names = await database_adapter.schemas(database_name)
    except Exception as exc:
        logger.exception(
            "Failed to inspect schemas for database '%s' in registry '%s'",
            database_name,
            registry_id,
        )
        raise HTTPException(status_code=503, detail="Database schemas unavailable") from exc

    return [{"name": schema_name} for schema_name in schema_names]


@router.get("/api/databases/{registry_id}/usage", response_model=DatabaseUsageResponse)
async def get_database_usage(registry_id: UUID, _user: User = Depends(authsupport)) -> dict[str, int]:
    """Return total and free storage for one database backend."""

    registry = await database.get(registry_id)

    # Require an existing active registry.
    if registry is None:
        raise HTTPException(status_code=404, detail=f"Database registry '{registry_id}' not found")

    database_adapter = adapters.database(registry)

    # Inspect backend usage through the adapter.
    try:
        data = await database_adapter.usage()
    except Exception as exc:
        logger.exception("Failed to inspect database usage for registry '%s'", registry_id)
        raise HTTPException(status_code=503, detail="Database usage unavailable") from exc

    return data
