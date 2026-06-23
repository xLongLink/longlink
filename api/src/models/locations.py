from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field
from src.models.countries import Country
from src.models.compute import ComputeRegistryResponse
from src.models.database import DatabaseRegistryResponse
from src.models.storage import StorageRegistryResponse
from src.models.users import UserSummary


class LocationOrganizationSummary(BaseModel):
    """Represent one organization nested under a location."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    location_id: UUID

    # Audit
    created_at: datetime
    updated_at: datetime
    created_by: UserSummary
    updated_by: UserSummary
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None


class LocationCreate(BaseModel):
    """Request body for creating a location."""

    # Metadata
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=128)
    country: Country


class LocationResponse(BaseModel):
    """Represent one location in API responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    slug: str
    country: Country

    # Audit
    created_at: datetime
    updated_at: datetime

    # Relationships
    organizations: list[LocationOrganizationSummary] = Field(default_factory=list)
    compute_registries: list[ComputeRegistryResponse] = Field(default_factory=list)
    storage_registries: list[StorageRegistryResponse] = Field(default_factory=list)
    database_registries: list[DatabaseRegistryResponse] = Field(default_factory=list)
