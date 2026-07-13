import urllib.parse
from enum import StrEnum
from uuid import UUID
from datetime import datetime
from pydantic import Field, BaseModel, ConfigDict, field_validator
from tenant.models.icons import Icon
from src.models.users import UserSummary
from src.models.statuses import ApplicationStatus


class DatabaseKind(StrEnum):
    """Supported database registry kinds."""

    postgresql = "postgresql"


class OrganizationDatabaseResourceKind(StrEnum):
    """Supported organization database resource kinds."""

    schema = "schema"


class DatabaseRegistryCreate(BaseModel):
    """Request body for creating a database registry."""

    # Metadata
    kind: DatabaseKind
    name: str = Field(min_length=1, max_length=128)

    # Connection
    host: str = Field(min_length=1, max_length=255)
    port: int = Field(ge=1, le=65535)
    password: str = Field(min_length=1, max_length=255)
    username: str = Field(min_length=1, max_length=255)

    # Relationships
    location_id: UUID

    @field_validator("host")
    @classmethod
    def validate_host(cls, host: str) -> str:
        """Validate a database host value accepted from registry requests."""

        value = host.strip().rstrip("/")
        parsed_host = urllib.parse.urlsplit(f"//{value}")

        # Database hosts must be plain host or host:port values without URL syntax or credentials.
        if (
            not value
            or "://" in value
            or parsed_host.hostname is None
            or parsed_host.username
            or parsed_host.password
            or parsed_host.path not in {"", "/"}
            or parsed_host.query
            or parsed_host.fragment
            or any(
                character.isspace() or ord(character) < 32 or ord(character) == 127 for character in value
            )
        ):
            raise ValueError("Database host is invalid")

        # Access the port property so invalid numeric ports are rejected by urllib.
        try:
            parsed_host.port
        except ValueError as exc:
            raise ValueError("Database host port is invalid") from exc

        return value


class OrganizationDatabaseApplicationResponse(BaseModel):
    """Represent the application using one database resource."""

    # Identifier
    id: UUID

    # Metadata
    name: str
    slug: str
    icon: Icon | None = None
    description: str | None = None

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

    # Usage
    space_used: int | None = None
    table_count: int | None = None


class OrganizationDatabaseTableColumnResponse(BaseModel):
    """Represent one column in a database table preview."""

    # Metadata
    name: str
    type: str

    # State
    nullable: bool

    # Position
    position: int


class OrganizationDatabaseTableColumnsResponse(BaseModel):
    """Represent one database table with its columns."""

    # Metadata
    name: str
    schema_name: str

    # Relationships
    columns: list[OrganizationDatabaseTableColumnResponse]


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
