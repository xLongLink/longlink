from datetime import datetime
from pydantic import Field, BaseModel, ConfigDict
from src.models.locations import LocationResponse
from src.models.applications import AppStatus
from src.models.organization_summary import OrganizationSummary
from src.models.users import UserSummary


class OrganizationCreate(BaseModel):
    """Validate organization creation payloads."""

    name: str = Field(min_length=1, max_length=128)
    avatar: str | None = None
    location_id: str


class OrganizationApplicationResponse(BaseModel):
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


class OrganizationDetails(BaseModel):
    """Represent an organization with its members."""

    model_config = ConfigDict(from_attributes=True)

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
    applications: list[OrganizationApplicationResponse] = Field(default_factory=list)

