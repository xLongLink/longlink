from uuid import UUID
from pydantic import Field, BaseModel, ConfigDict, field_validator
from src.models.infrastructure import exoscale_zone


class StorageRegistryCreate(BaseModel):
    """Validate one storage registry creation payload."""

    # Metadata
    name: str = Field(min_length=1, max_length=128)

    # Connection
    endpoint_url: str = Field(min_length=1, max_length=255)

    # Credentials
    access_key_id: str = Field(min_length=1, max_length=255)
    secret_access_key: str = Field(min_length=1, max_length=255)

    @field_validator("endpoint_url")
    @classmethod
    def validate_endpoint_url(cls, endpoint_url: str) -> str:
        """Validate one Exoscale SOS endpoint."""

        # Normalize and validate the provider endpoint before persistence.
        value = endpoint_url.strip().rstrip("/")

        # Storage registries currently support only zone-specific Exoscale SOS endpoints.
        exoscale_zone(value)
        return value


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
