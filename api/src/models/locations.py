from uuid import UUID
from pydantic import Field, BaseModel, ConfigDict
from src.models.countries import Country


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
