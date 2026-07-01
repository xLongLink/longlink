from enum import Enum
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from src.models.users import UserSummary


class StorageKind(str, Enum):
    """Supported storage registry kinds."""

    s3 = "s3"


class StorageRegistryCreate(BaseModel):
    """Request body for creating a storage registry."""

    # Metadata
    kind: StorageKind
    name: str
    protocol: str
    endpoint_url: str
    access_key_id: str
    secret_access_key: str

    # Relationships
    location_id: UUID


class StorageBucketResponse(BaseModel):
    """Represent one bucket on a storage backend."""

    # Metadata
    name: str


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
    endpoint_url: str
    access_key_id: str

    # Relationships
    location_id: UUID

    # Audit
    created_at: datetime
    created_by: UserSummary
    updated_at: datetime
    updated_by: UserSummary
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None
