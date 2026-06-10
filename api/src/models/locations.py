from datetime import datetime
from pydantic import Field, BaseModel, ConfigDict
from src.models.compute import ComputeRegistryResponse
from src.models.database import DatabaseRegistryResponse
from src.models.users import UserSummary
from src.models.storage import StorageRegistryResponse


class LocationOrgSummary(BaseModel):
    """Represent one organization nested under a location."""

    model_config = ConfigDict(from_attributes=True)

    name: str
    location_id: int
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
    country: str = Field(default="", max_length=128)


class LocationResponse(BaseModel):
    """Represent one location in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    display_name: str
    country: str = ""
    created_at: datetime
    updated_at: datetime
    orgs: list[LocationOrgSummary] = Field(default_factory=list)
    compute_registries: list[ComputeRegistryResponse] = Field(default_factory=list)
    database_registries: list[DatabaseRegistryResponse] = Field(default_factory=list)
    storage_registries: list[StorageRegistryResponse] = Field(default_factory=list)
