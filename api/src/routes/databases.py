from uuid import UUID
from fastapi import Depends, APIRouter
from src.auth import authadmin, authsupport
from src.errors import ConflictError, NotFoundError
from src.models.common import SuccessResponse
from src.models.databases import (DatabaseUsageResponse,
                                  DatabaseRegistryCreate,
                                  DatabaseSchemaResponse,
                                  DatabaseDatabaseResponse,
                                  DatabaseRegistryResponse)
from src.adapters.database import Postgres
from src.database.models.users import User
from src.database.services.database import database

router = APIRouter()


@router.get("/api/databases", response_model=list[DatabaseRegistryResponse])
async def list_database_registries(_user: User = Depends(authsupport)) -> list[DatabaseRegistryResponse]:
    """Return all registered database backends."""

    return await database.list()


@router.get("/api/databases/{registry_id}", response_model=DatabaseRegistryResponse)
async def get_database_registry(registry_id: UUID, _: User = Depends(authsupport)) -> DatabaseRegistryResponse:
    """Return one database backend registration."""

    registry = await database.get(registry_id)
    if registry is None:
        raise NotFoundError("Database registry", registry_id)

    return registry


@router.post("/api/databases", response_model=DatabaseRegistryResponse)
async def create_database_registry(payload: DatabaseRegistryCreate, user: User = Depends(authadmin)) -> DatabaseRegistryResponse:
    """Create or update one database backend registration."""

    try:
        registry = await database.create(**payload.model_dump(), user=user)
    except ValueError as exc:
        raise ConflictError(str(exc)) from exc

    return registry


@router.get("/api/databases/{registry_id}/databases", response_model=list[DatabaseDatabaseResponse])
async def list_database_databases(registry_id: UUID, _: User = Depends(authsupport)) -> list[DatabaseDatabaseResponse]:
    """List all databases on a database backend."""

    registry = await database.get(registry_id)
    if registry is None:
        raise NotFoundError("Database registry", registry_id)

    postgres = Postgres(registry.host, registry.port, registry.username, registry.password)
    names = await postgres.databases()
    return [DatabaseDatabaseResponse(name=n) for n in names]


@router.get("/api/databases/{registry_id}/databases/{database_name}/schemas", response_model=list[DatabaseSchemaResponse])
async def list_database_schemas(
    registry_id: UUID,
    database_name: str,
    _: User = Depends(authsupport),
) -> list[DatabaseSchemaResponse]:
    """List all schemas in a database on a database backend."""

    registry = await database.get(registry_id)
    if registry is None:
        raise NotFoundError("Database registry", registry_id)

    postgres = Postgres(registry.host, registry.port, registry.username, registry.password)
    names = await postgres.schemas(database_name)
    return [DatabaseSchemaResponse(name=n) for n in names]


@router.get("/api/databases/{registry_id}/usage", response_model=DatabaseUsageResponse)
async def get_database_usage(registry_id: UUID, _user: User = Depends(authsupport)) -> DatabaseUsageResponse:
    """Return total and free storage for one database backend."""

    registry = await database.get(registry_id)
    if registry is None:
        raise NotFoundError("Database registry", registry_id)

    postgres = Postgres(registry.host, registry.port, registry.username, registry.password)
    data = await postgres.usage()
    return DatabaseUsageResponse(**data)


@router.delete("/api/databases/{registry_id}", response_model=SuccessResponse)
async def delete_database_registry(registry_id: UUID, user: User = Depends(authadmin)) -> SuccessResponse:
    """Mark one database backend registration as deleted."""

    try:
        registry = await database.delete(registry_id, user.id)
    except ValueError as exc:
        raise ConflictError(str(exc)) from exc

    if registry is None:
        raise NotFoundError("Database registry", registry_id)

    return SuccessResponse()
