import src.db as db
from fastapi import Depends, Response, APIRouter, HTTPException, status
from src.auth import authadmin
from src.models import DatabaseRegistryCreate, DatabaseRegistryResponse

router = APIRouter(prefix="/api/database")


@router.get("", response_model=list[DatabaseRegistryResponse])
async def list_database_registries(_user: db.User = Depends(authadmin)) -> list[DatabaseRegistryResponse]:
    """Return all registered database backends."""

    registries = await db.database.list()
    payload = [
        DatabaseRegistryResponse.model_validate(
                {
                    "id": registry.id,
                    "kind": registry.kind,
                    "name": registry.name,
                    "host": registry.host,
                    "port": registry.port,
                "username": registry.username,
                "sslmode": registry.sslmode,
                "maintenance_database": registry.maintenance_database,
            }
        )
        for registry in registries
    ]

    return payload


@router.get("/{name}", response_model=DatabaseRegistryResponse)
async def get_database_registry(name: str, _user: db.User = Depends(authadmin)) -> DatabaseRegistryResponse:
    """Return one database backend registration."""

    registry = await db.database.get(name)
    if registry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Database '{name}' not found")

    return DatabaseRegistryResponse.model_validate(
        {
            "id": registry.id,
            "kind": registry.kind,
            "name": registry.name,
            "host": registry.host,
            "port": registry.port,
            "username": registry.username,
            "sslmode": registry.sslmode,
            "maintenance_database": registry.maintenance_database,
        }
    )


@router.post("", response_model=DatabaseRegistryResponse)
async def create_database_registry(
    payload: DatabaseRegistryCreate,
    _user: db.User = Depends(authadmin),
) -> DatabaseRegistryResponse:
    """Create or update one database backend registration."""

    registry = await db.database.create(**payload.model_dump())

    return DatabaseRegistryResponse.model_validate(
        {
            "id": registry.id,
            "kind": registry.kind,
            "name": registry.name,
            "host": registry.host,
            "port": registry.port,
            "username": registry.username,
            "sslmode": registry.sslmode,
            "maintenance_database": registry.maintenance_database,
        }
    )


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_database_registry(name: str, _user: db.User = Depends(authadmin)) -> Response:
    """Delete one database backend registration."""

    registry = await db.database.delete(name)
    if registry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Database '{name}' not found")

    return Response(status_code=status.HTTP_204_NO_CONTENT)
