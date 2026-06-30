from enum import Enum
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from src.models.users import UserSummary
from src.models.statuses import ApplicationStatus


class DatabaseKind(str, Enum):
    """Supported database registry kinds."""

    postgresql = "postgresql"


class OrganizationDatabaseResourceKind(str, Enum):
    """Supported organization database resource kinds."""

    schema = "schema"
    shared_table = "shared_table"


class OrganizationDatabaseResourceStatus(str, Enum):
    """Organization database resource inspection states."""

    missing = "missing"
    orphaned = "orphaned"
    available = "available"
    unavailable = "unavailable"


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


class OrganizationDatabaseApplicationResponse(BaseModel):
    """Represent the application using one database resource."""

    # Identifier
    id: UUID

    # Metadata
    name: str
    slug: str

    # State
    status: ApplicationStatus


class OrganizationDatabaseResourceResponse(BaseModel):
    """Represent one database resource owned by an organization."""

    # Metadata
    kind: OrganizationDatabaseResourceKind
    name: str

    # Database
    database_name: str
    database_registry_id: UUID
    database_registry_name: str

    # Relationships
    application: OrganizationDatabaseApplicationResponse | None = None

    # State
    status: OrganizationDatabaseResourceStatus

    # Usage
    space_used: int | None = None
    table_count: int | None = None
    row_estimate: int | None = None


class OrganizationDatabaseTableColumnResponse(BaseModel):
    """Represent one column in a database table preview."""

    # Metadata
    name: str
    type: str

    # State
    nullable: bool

    # Position
    position: int


class OrganizationDatabaseTableResponse(BaseModel):
    """Represent one database table with preview rows."""

    # Metadata
    name: str
    schema_name: str

    # Relationships
    columns: list[OrganizationDatabaseTableColumnResponse]

    # Data
    rows: list[dict[str, str | int | float | bool | None]]


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
