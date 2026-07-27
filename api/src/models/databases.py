from uuid import UUID
from pydantic import Field, BaseModel, ConfigDict
from src.models.types import DatabaseSSLMode
from src.models.resources import OrganizationApplicationSummary
from src.models.infrastructure import DatabaseConfiguration


class DatabaseRegistryCreate(DatabaseConfiguration):
    """Validate one database registry creation payload."""

    # Metadata
    name: str = Field(min_length=1, max_length=128)


class OrganizationDatabaseResourceResponse(BaseModel):
    """Represent a live database schema and usage within one Organization database.

    A missing application association identifies shared or orphaned backend state, not additional desired state.
    """

    # Metadata
    name: str

    # Database
    database_name: str

    # Relationships
    application: OrganizationApplicationSummary | None = None

    # Usage
    space_used: int | None = None
    table_count: int | None = None


class DatabaseRegistryResponse(BaseModel):
    """Describe one database backend while filtering its administrator password.

    Non-secret connection metadata remains available for administrator diagnostics.
    """

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    slug: str

    # Connection
    host: str
    port: int
    sslmode: DatabaseSSLMode
    username: str
