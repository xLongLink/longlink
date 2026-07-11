import urllib.parse
from enum import StrEnum
from uuid import UUID
from typing import Literal
from datetime import datetime
from pydantic import Field, BaseModel, ConfigDict, field_validator
from src.models.icons import Icon
from src.models.users import UserSummary
from src.models.statuses import ApplicationStatus


class StorageKind(StrEnum):
    """Supported storage registry kinds."""

    s3 = "s3"


class OrganizationStorageResourceKind(StrEnum):
    """Supported organization storage resource kinds."""

    shared_bucket = "shared_bucket"
    application_bucket = "application_bucket"


class OrganizationStorageApplicationResponse(BaseModel):
    """Represent an application associated with a storage resource."""

    # Identifier
    id: UUID

    # Metadata
    name: str
    slug: str
    icon: Icon | None = None
    description: str | None = None

    # State
    status: ApplicationStatus


class StorageRegistryCreate(BaseModel):
    """Request body for creating a storage registry."""

    # Metadata
    kind: StorageKind
    name: str
    protocol: Literal["http", "https"]

    # Connection
    endpoint_url: str = Field(min_length=1, max_length=255)
    access_key_id: str
    secret_access_key: str
    runtime_endpoint_url: str | None = Field(default=None, max_length=255)

    # Relationships
    location_id: UUID

    @field_validator("endpoint_url", "runtime_endpoint_url")
    @classmethod
    def validate_endpoint_url(cls, endpoint_url: str | None) -> str | None:
        """Validate storage endpoint URLs accepted from registry requests."""

        # Optional runtime endpoints can fall back to the control endpoint.
        if endpoint_url is None:
            return None

        value = endpoint_url.strip().rstrip("/")

        # Endpoint URLs must be ordinary HTTP(S) URLs without embedded credentials.
        parsed_url = urllib.parse.urlsplit(value)
        if (
            not value
            or parsed_url.scheme not in {"http", "https"}
            or not parsed_url.netloc
            or parsed_url.username
            or parsed_url.password
            or parsed_url.query
            or parsed_url.fragment
            or any(
                character.isspace() or ord(character) < 32 or ord(character) == 127 for character in value
            )
        ):
            raise ValueError("Storage endpoint URL is invalid")

        # Access the port property so invalid numeric ports are rejected by urllib.
        try:
            parsed_url.port
        except ValueError as exc:
            raise ValueError("Storage endpoint URL port is invalid") from exc

        return value


class StorageBucketResponse(BaseModel):
    """Represent one bucket on a storage backend."""

    # Metadata
    name: str


class OrganizationStorageResourceResponse(BaseModel):
    """Represent one managed organization storage resource."""

    # Metadata
    kind: OrganizationStorageResourceKind
    name: str
    bucket_name: str

    # Relationships
    application: OrganizationStorageApplicationResponse | None
    storage_registry_id: UUID
    storage_registry_name: str

    # Usage
    space_used: int | None = None
    object_count: int | None = None


class StorageObjectResponse(BaseModel):
    """Represent one object in a storage bucket."""

    # Metadata
    key: str
    etag: str | None = None

    # Usage
    size: int

    # Audit
    last_modified: datetime | None = None


class StorageRegistryResponse(BaseModel):
    """Represent one storage registry in API responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    kind: StorageKind
    name: str
    slug: str
    protocol: str

    # Connection
    endpoint_url: str
    access_key_id: str
    runtime_endpoint_url: str

    # Relationships
    location_id: UUID

    # Audit
    created_at: datetime
    created_by: UserSummary
    updated_at: datetime
    updated_by: UserSummary
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None
