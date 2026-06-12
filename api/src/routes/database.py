from fastapi import Depends, HTTPException
from src.auth import authadmin, authsupport
from src.router import router
from src.models.database import (DatabaseDatabaseResponse,
                                 DatabaseRegistryCreate,
                                 DatabaseRegistryResponse,
                                 DatabaseSchemaResponse)
from src.adapters.database.postgre import Postgre
from src.database.models.users import User
from src.database.services.database import database


@router.get("/api/database", response_model=list[DatabaseRegistryResponse])
async def list_database_registries(_user: User = Depends(authsupport)) -> list[DatabaseRegistryResponse]:
    """Return all registered database backends."""

    return await database.list()


@router.get("/api/database/{registry_id}", response_model=DatabaseRegistryResponse)
async def get_database_registry(registry_id: str, _user: User = Depends(authsupport)) -> DatabaseRegistryResponse:
    """Return one database backend registration."""

    registry = await database.get(registry_id)
    if registry is None:
        raise HTTPException(status_code=404, detail=f"Database '{registry_id}' not found")

    return registry


@router.post("/api/database", response_model=DatabaseRegistryResponse)
async def create_database_registry(
    payload: DatabaseRegistryCreate,
    _user: User = Depends(authadmin),
) -> DatabaseRegistryResponse:
    """Create or update one database backend registration."""

    registry = await database.create(**payload.model_dump())

    return registry


@router.get("/api/database/{registry_id}/databases", response_model=list[DatabaseDatabaseResponse])
async def list_database_databases(registry_id: str, _user: User = Depends(authsupport)) -> list[DatabaseDatabaseResponse]:
    """List all databases on a database backend."""

    registry = await database.get(registry_id)
    if registry is None:
        raise HTTPException(status_code=404, detail=f"Database '{registry_id}' not found")

    postgre = Postgre(registry.host, registry.port, registry.username, registry.password)
    names = await postgre.databases()
    return [DatabaseDatabaseResponse(name=n) for n in names]


@router.get(
    "/api/database/{registry_id}/databases/{dbname}/schemas",
    response_model=list[DatabaseSchemaResponse],
)
async def list_database_schemas(
    registry_id: str,
    dbname: str,
    _user: User = Depends(authsupport),
) -> list[DatabaseSchemaResponse]:
    """List all schemas in a database on a database backend."""

    registry = await database.get(registry_id)
    if registry is None:
        raise HTTPException(status_code=404, detail=f"Database '{registry_id}' not found")

    postgre = Postgre(registry.host, registry.port, registry.username, registry.password)
    names = await postgre.schemas(dbname)
    return [DatabaseSchemaResponse(name=n) for n in names]


@router.delete("/api/database/{registry_id}", status_code=204)
async def delete_database_registry(registry_id: str, user: User = Depends(authadmin)) -> None:
    """Mark one database backend registration as deleted."""

    registry = await database.delete(registry_id, user.id)
    if registry is None:
        raise HTTPException(status_code=404, detail=f"Database '{registry_id}' not found")

    return
