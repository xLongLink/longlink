from uuid import UUID
from pydantic import Field, BaseModel, ConfigDict
from src.models.statuses import LocationStatus
from src.models.countries import Country
from src.models.operations import OperationResponse
from src.models.infrastructure import ComputeConfiguration, StorageConfiguration, DatabaseConfiguration


class LocationCreate(BaseModel):
    """Request body for creating a location."""

    # Metadata
    name: str = Field(min_length=1, max_length=255)
    country: Country

    # Immutable infrastructure
    compute: ComputeConfiguration
    storage: StorageConfiguration
    database: DatabaseConfiguration


class LocationResponse(BaseModel):
    """Represent one location in API responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    slug: str
    country: Country

    # State
    status: LocationStatus
    version: str | None


class LocationMutationResponse(BaseModel):
    """Return a changed location and its coalesced reconciliation operation."""

    # Result
    location: LocationResponse
    operation: OperationResponse
