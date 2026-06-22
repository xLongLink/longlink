from enum import Enum
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from src.models.users import UserSummary


class DatabaseKind(str, Enum):
    """Supported database registry kinds."""

    postgre = "postgre"


class DatabaseRegistryCreate(BaseModel):
    """Request body for creating a database registry."""

    # Metadata
    kind: DatabaseKind
    name: str
    host: str
    port: int
    password: str
    username: str

    # Relationships
    location_id: UUID


class DatabaseDatabaseResponse(BaseModel):
    """Represent one database on a database server."""

    # Metadata
    name: str


class DatabaseSchemaResponse(BaseModel):
    """Represent one schema (namespace) in a database."""

    # Metadata
    name: str


class DatabaseRegistryResponse(BaseModel):
    """Represent one database registry in API responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    kind: DatabaseKind
    name: str
    host: str
    port: int
    password: str
    username: str

    # Relationships
    location_id: UUID

    # Audit
    created_at: datetime
    created_by: UserSummary | None = None
    updated_at: datetime
    updated_by: UserSummary | None = None
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None
