from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from src.models.users import UserSummary
from src.models.resources import OrganizationResourceApplicationResponse
from src.models.infrastructure import DatabaseKind


class OrganizationDatabaseResourceResponse(BaseModel):
    """Represent one database resource owned by an organization."""

    # Metadata
    name: str

    # Database
    database_name: str

    # Relationships
    application: OrganizationResourceApplicationResponse | None = None

    # Usage
    space_used: int | None = None
    table_count: int | None = None


class DatabaseRegistryResponse(BaseModel):
    """Represent one database registry in API responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    kind: DatabaseKind
    name: str
    slug: str

    # Connection
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
