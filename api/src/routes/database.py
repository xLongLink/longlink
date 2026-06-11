from fastapi import Depends, HTTPException
from src.auth import authadmin
from src.router import router
from src.models.database import (DatabaseDatabaseResponse,
                                 DatabaseRegistryCreate,
                                 DatabaseRegistryResponse,
                                 DatabaseSchemaResponse)
from src.adapters.database.postgre import Postgre
from src.database.models.users import User
from src.database.services.database import database


@router.get("/api/database", response_model=list[DatabaseRegistryResponse])
async def list_database_registries(_user: User = Depends(authadmin)) -> list[DatabaseRegistryResponse]:
    """Return all registered database backends."""

    return await database.list()


@router.get("/api/database/{name}", response_model=DatabaseRegistryResponse)
async def get_database_registry(name: str, _user: User = Depends(authadmin)) -> DatabaseRegistryResponse:
    """Return one database backend registration."""

    registry = await database.get(name)
    if registry is None:
        raise HTTPException(status_code=404, detail=f"Database '{name}' not found")

    return registry


@router.post("/api/database", response_model=DatabaseRegistryResponse)
async def create_database_registry(
    payload: DatabaseRegistryCreate,
    _user: User = Depends(authadmin),
) -> DatabaseRegistryResponse:
    """Create or update one database backend registration."""

    registry = await database.create(**payload.model_dump())

    return registry


@router.get("/api/database/{name}/databases", response_model=list[DatabaseDatabaseResponse])
async def list_database_databases(name: str, _user: User = Depends(authadmin)) -> list[DatabaseDatabaseResponse]:
    """List all databases on a database backend."""

    registry = await database.get(name)
    if registry is None:
        raise HTTPException(status_code=404, detail=f"Database '{name}' not found")

    postgre = Postgre(registry.host, registry.port, registry.username, registry.password)
    names = await postgre.databases()
    return [DatabaseDatabaseResponse(name=n) for n in names]


@router.get(
    "/api/database/{name}/databases/{dbname}/schemas",
    response_model=list[DatabaseSchemaResponse],
)
async def list_database_schemas(
    name: str,
    dbname: str,
    _user: User = Depends(authadmin),
) -> list[DatabaseSchemaResponse]:
    """List all schemas in a database on a database backend."""

    registry = await database.get(name)
    if registry is None:
        raise HTTPException(status_code=404, detail=f"Database '{name}' not found")

    postgre = Postgre(registry.host, registry.port, registry.username, registry.password)
    names = await postgre.schemas(dbname)
    return [DatabaseSchemaResponse(name=n) for n in names]


@router.delete("/api/database/{name}", status_code=204)
async def delete_database_registry(name: str, user: User = Depends(authadmin)) -> None:
    """Mark one database backend registration as deleted."""

    registry = await database.delete(name, user.id)
    if registry is None:
        raise HTTPException(status_code=404, detail=f"Database '{name}' not found")

    return
