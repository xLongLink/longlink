from uuid import UUID
from enum import Enum
from pydantic import Field, BaseModel, ConfigDict
from src.models.countries import Country


class LocationProvider(str, Enum):
    """Supported datacenter providers for locations."""

    local = "local"
    infomaniak = "infomaniak"
    ovh = "ovh"
    scaleway = "scaleway"
    hetzner = "hetzner"
    exoscale = "exoscale"


class LocationCreate(BaseModel):
    """Request body for creating a location."""

    # Metadata
    name: str = Field(min_length=1, max_length=255)
    country: Country
    provider: LocationProvider = LocationProvider.local


class LocationResponse(BaseModel):
    """Represent one location in API responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    slug: str
    country: Country
    provider: LocationProvider
