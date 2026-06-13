from datetime import datetime
from pydantic import BaseModel, ConfigDict
from src.models.kinds import DatabaseKind
from src.models.users import UserSummary


class DatabaseRegistryCreate(BaseModel):
    """Request body for creating a database registry."""

    kind: DatabaseKind
    name: str
    host: str
    port: int
    username: str
    password: str
    location_id: str


class DatabaseDatabaseResponse(BaseModel):
    """Represent one database on a database server."""

    name: str


class DatabaseSchemaResponse(BaseModel):
    """Represent one schema (namespace) in a database."""

    name: str


class DatabaseRegistryResponse(BaseModel):
    """Represent one database registry in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    kind: DatabaseKind
    name: str
    host: str
    port: int
    username: str
    location_id: str
    created_at: datetime
    created_by: UserSummary | None = None
    updated_at: datetime
    updated_by: UserSummary | None = None
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None
