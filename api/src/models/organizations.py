from datetime import datetime
from uuid import UUID
from pydantic import Field, BaseModel, ConfigDict
from src.models.locations import LocationResponse
from src.models.applications import AppStatus
from src.models.organization_summary import OrganizationSummary
from src.models.users import Avatar, UserSummary


class OrganizationCreate(BaseModel):
    """Validate organization creation payloads."""

    # Metadata
    name: str = Field(min_length=1, max_length=128)
    avatar: str | None = None

    # Location
    location_id: UUID


class OrganizationApplicationResponse(BaseModel):
    """Represent one application in an organization payload."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    slug: str
    icon: str | None = None
    description: str | None = None

    # State
    status: AppStatus

    # Audit
    created_at: datetime
    updated_at: datetime
    created_by: UserSummary
    updated_by: UserSummary
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None


class OrganizationDetails(BaseModel):
    """Represent an organization with its members."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    avatar: Avatar = ""

    # Location
    location: LocationResponse
    location_id: UUID

    # Audit
    created_at: datetime
    updated_at: datetime
    created_by: UserSummary
    updated_by: UserSummary
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None

    # Relationships
    users: list[UserSummary]
    applications: list[OrganizationApplicationResponse] = Field(default_factory=list)
