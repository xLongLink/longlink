from enum import Enum
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from src.models.users import UserSummary


class DatabaseKind(str, Enum):
    """Supported database registry kinds."""

    postgresql = "postgresql"


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


class DatabaseUsageResponse(BaseModel):
    """Represent database storage usage in API responses."""

    # Capacity
    space_used: int


class DatabaseRegistryResponse(BaseModel):
    """Represent one database registry in API responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    kind: DatabaseKind
    name: str
    slug: str
    host: str
    port: int
    username: str

    # Relationships
    location_id: UUID

    # Audit
    created_at: datetime
    created_by: UserSummary
    updated_at: datetime
    updated_by: UserSummary
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None
