from enum import StrEnum
from uuid import UUID
from datetime import datetime
from pydantic import Field, BaseModel, ConfigDict
from src.models.types import StorageKind
from src.models.users import UserSummary
from src.models.resources import OrganizationResourceApplicationResponse
from src.models.infrastructure import StorageConfiguration


class StorageRegistryCreate(StorageConfiguration):
    """Validate one storage registry creation payload."""

    # Metadata
    name: str = Field(min_length=1, max_length=128)


class OrganizationStorageResourceKind(StrEnum):
    """Supported organization storage resource kinds."""

    shared_prefix = "shared_prefix"
    application_prefix = "application_prefix"


class OrganizationStorageResourceResponse(BaseModel):
    """Represent one managed organization storage resource."""

    # Metadata
    kind: OrganizationStorageResourceKind
    name: str
    prefix: str
    bucket_name: str

    # Relationships
    application: OrganizationResourceApplicationResponse | None

    # Usage
    space_used: int | None = None
    object_count: int | None = None


class StorageRegistryResponse(BaseModel):
    """Describe one object-storage backend while filtering its secret access key.

    Local MinIO key identifiers remain visible, while Exoscale provisioning credentials stay in Platform settings.
    """

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    kind: StorageKind
    name: str
    slug: str

    # Connection
    endpoint_url: str
    access_key_id: str | None
    runtime_endpoint_url: str

    # Audit
    created_at: datetime
    created_by: UserSummary
    updated_at: datetime
    updated_by: UserSummary
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None
