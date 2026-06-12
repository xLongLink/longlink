from datetime import datetime
from pydantic import Field, BaseModel, ConfigDict
from src.models.users import UserSummary
from src.models.locations import LocationResponse
from src.models.applications import AppStatus


class OrgCreate(BaseModel):
    """Validate org creation payloads."""

    name: str = Field(min_length=1, max_length=128)
    avatar: str | None = None
    location_id: str


class OrgSummary(BaseModel):
    """Represent one organization in admin list responses."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    avatar: str | None = None
    location_id: str
    created_at: datetime
    updated_at: datetime
    created_by: UserSummary | None = None
    updated_by: UserSummary | None = None
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None


class OrgAppResponse(BaseModel):
    """Represent one application in an organization payload."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    status: AppStatus
    description: str | None = None
    icon: str | None = None
    created_at: datetime
    updated_at: datetime
    created_by: UserSummary | None = None
    updated_by: UserSummary | None = None
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None


class OrgDetails(BaseModel):
    """Represent an organization with its members."""

    id: str
    name: str
    avatar: str | None = None
    location_id: str
    location: LocationResponse
    created_at: datetime
    updated_at: datetime
    created_by: UserSummary | None = None
    updated_by: UserSummary | None = None
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None
    users: list[UserSummary]
    apps: list[OrgAppResponse] = Field(default_factory=list)
