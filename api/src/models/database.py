from pydantic import BaseModel, ConfigDict
from src.models.kinds import DatabaseKind


class DatabaseRegistryCreate(BaseModel):
    """Request body for creating a database registry."""

    kind: DatabaseKind
    name: str
    host: str
    port: int
    username: str
    password: str
    sslmode: str | None = None
    maintenance_database: str = "postgres"
    location_id: int


class DatabaseRegistryResponse(BaseModel):
    """Represent one database registry in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: DatabaseKind
    name: str
    host: str
    port: int
    username: str
    sslmode: str | None = None
    maintenance_database: str = "postgres"
    location_id: int
