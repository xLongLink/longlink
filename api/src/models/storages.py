from enum import StrEnum
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from src.models.users import UserSummary
from src.models.resources import OrganizationResourceApplicationResponse
from src.models.infrastructure import StorageKind


class OrganizationStorageResourceKind(StrEnum):
    """Supported organization storage resource kinds."""

    shared_bucket = "shared_bucket"
    application_bucket = "application_bucket"


class OrganizationStorageResourceResponse(BaseModel):
    """Represent one managed organization storage resource."""

    # Metadata
    kind: OrganizationStorageResourceKind
    name: str
    bucket_name: str

    # Relationships
    application: OrganizationResourceApplicationResponse | None

    # Usage
    space_used: int | None = None
    object_count: int | None = None


class StorageRegistryResponse(BaseModel):
    """Represent one storage registry in API responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    kind: StorageKind
    name: str
    slug: str

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
