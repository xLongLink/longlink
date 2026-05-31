from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class LocationCreate(BaseModel):
    """Request body for creating a location."""

    name: str = Field(min_length=1, max_length=128)
    display_name: str = Field(min_length=1, max_length=255)

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        """Trim whitespace from location names."""
        return value.strip()

    @field_validator("display_name", mode="before")
    @classmethod
    def normalize_display_name(cls, value: str) -> str:
        """Trim whitespace from display names."""
        return value.strip()


class LocationResponse(BaseModel):
    """Represent one location in API responses."""

    id: int
    name: str
    display_name: str
    created_at: datetime
    updated_at: datetime
