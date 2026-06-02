from datetime import datetime
from pydantic import Field, BaseModel, ConfigDict, field_validator
from src.models.compute import ComputeRegistryResponse
from src.models.database import DatabaseRegistryResponse
from src.models.users import UserSummary
from src.models.storage import StorageRegistryResponse


class LocationOrgSummary(BaseModel):
    """Represent one organization nested under a location."""

    model_config = ConfigDict(from_attributes=True)

    name: str
    location_id: int | None = None
    created_at: datetime
    updated_at: datetime
    created_by: UserSummary | None = None
    updated_by: UserSummary | None = None
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None


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

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    display_name: str
    created_at: datetime
    updated_at: datetime
    orgs: list[LocationOrgSummary] = Field(default_factory=list)
    compute_registries: list[ComputeRegistryResponse] = Field(default_factory=list)
    database_registries: list[DatabaseRegistryResponse] = Field(default_factory=list)
    storage_registries: list[StorageRegistryResponse] = Field(default_factory=list)
