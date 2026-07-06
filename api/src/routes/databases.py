from uuid import UUID
from fastapi import Depends, Response, APIRouter
from src.auth import authadmin, authsupport
from src import adapters
from src.logger import logger
from src.errors import ConflictError, NotFoundError, UnavailableError
from src.models.databases import (
    DatabaseUsageResponse,
    DatabaseRegistryCreate,
    DatabaseSchemaResponse,
    DatabaseDatabaseResponse,
    DatabaseRegistryResponse,
)
from src.database.models.users import User
from src.database.services import database

router = APIRouter()


@router.get("/api/databases", response_model=list[DatabaseRegistryResponse])
async def list_database_registries(
    _user: User = Depends(authsupport),
) -> list[DatabaseRegistryResponse]:
    """Return all registered database backends."""

    registries = await database.fetch_all()
    return [DatabaseRegistryResponse.model_validate(registry) for registry in registries]


@router.get("/api/databases/{registry_id}", response_model=DatabaseRegistryResponse)
async def get_database_registry(registry_id: UUID, _: User = Depends(authsupport)) -> DatabaseRegistryResponse:
    """Return one database backend registration."""

    registry = await database.get(registry_id)
    if registry is None:
        raise NotFoundError("Database registry", registry_id)

    return DatabaseRegistryResponse.model_validate(registry)


@router.delete("/api/databases/{registry_id}", status_code=204)
async def delete_database_registry(registry_id: UUID, user: User = Depends(authadmin)) -> Response:
    """Soft-delete one database backend registration."""

    try:
        deleted = await database.delete(registry_id, user)
    except ValueError as exc:
        raise ConflictError(str(exc)) from exc

    if not deleted:
        raise NotFoundError("Database registry", registry_id)

    return Response(status_code=204)


@router.post("/api/databases", response_model=DatabaseRegistryResponse)
async def create_database_registry(
    payload: DatabaseRegistryCreate, user: User = Depends(authadmin)
) -> DatabaseRegistryResponse:
    """Create one database backend registration."""

    try:
        registry = await database.create(**payload.model_dump(), user=user)
    except ValueError as exc:
        raise ConflictError(str(exc)) from exc

    return DatabaseRegistryResponse.model_validate(registry)


@router.get(
    "/api/databases/{registry_id}/databases",
    response_model=list[DatabaseDatabaseResponse],
)
async def list_database_databases(registry_id: UUID, _: User = Depends(authsupport)) -> list[DatabaseDatabaseResponse]:
    """List all databases on a database backend."""

    registry = await database.get(registry_id)
    if registry is None:
        raise NotFoundError("Database registry", registry_id)

    database_adapter = adapters.database(registry)
    try:
        names = await database_adapter.databases()
    except Exception as exc:
        logger.exception("Failed to inspect databases for registry '%s'", registry_id)
        raise UnavailableError("Database resources unavailable") from exc

    return [DatabaseDatabaseResponse(name=n) for n in names]


@router.get(
    "/api/databases/{registry_id}/databases/{database_name}/schemas",
    response_model=list[DatabaseSchemaResponse],
)
async def list_database_schemas(
    registry_id: UUID,
    database_name: str,
    _: User = Depends(authsupport),
) -> list[DatabaseSchemaResponse]:
    """List all schemas in a database on a database backend."""

    registry = await database.get(registry_id)
    if registry is None:
        raise NotFoundError("Database registry", registry_id)

    database_adapter = adapters.database(registry)
    try:
        names = await database_adapter.schemas(database_name)
    except Exception as exc:
        logger.exception(
            "Failed to inspect schemas for database '%s' in registry '%s'",
            database_name,
            registry_id,
        )
        raise UnavailableError("Database schemas unavailable") from exc

    return [DatabaseSchemaResponse(name=n) for n in names]


@router.get("/api/databases/{registry_id}/usage", response_model=DatabaseUsageResponse)
async def get_database_usage(registry_id: UUID, _user: User = Depends(authsupport)) -> DatabaseUsageResponse:
    """Return total and free storage for one database backend."""

    registry = await database.get(registry_id)
    if registry is None:
        raise NotFoundError("Database registry", registry_id)

    database_adapter = adapters.database(registry)
    try:
        data = await database_adapter.usage()
    except Exception as exc:
        logger.exception("Failed to inspect database usage for registry '%s'", registry_id)
        raise UnavailableError("Database usage unavailable") from exc

    return DatabaseUsageResponse(**data)
