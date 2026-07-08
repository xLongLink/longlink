from enum import Enum
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from src.models.users import UserSummary
from src.models.icons import Icon
from src.models.statuses import ApplicationStatus


class StorageKind(str, Enum):
    """Supported storage registry kinds."""

    s3 = "s3"


class OrganizationStorageResourceKind(str, Enum):
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
    protocol: str

    # Connection
    endpoint_url: str
    access_key_id: str
    secret_access_key: str
    runtime_endpoint_url: str | None = None

    # Relationships
    location_id: UUID


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
