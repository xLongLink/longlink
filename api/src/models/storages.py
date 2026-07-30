from uuid import UUID
from pydantic import Field, BaseModel, ConfigDict
from src.models.infrastructure import StorageConfiguration


class StorageRegistryCreate(StorageConfiguration):
    """Validate one storage registry creation payload."""

    # Metadata
    name: str = Field(min_length=1, max_length=128)


class OrganizationStorageUsageResponse(BaseModel):
    """Represent live usage for one Organization bucket."""

    # Storage
    bucket_name: str

    # Usage
    space_used: int = Field(ge=0)


class StorageRegistryResponse(BaseModel):
    """Describe one Exoscale SOS backend without exposing Platform credentials."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str

    # Connection
    endpoint_url: str
