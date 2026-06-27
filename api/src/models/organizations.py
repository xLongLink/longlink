from uuid import UUID
from datetime import datetime
from enum import Enum
from pydantic import EmailStr, Field, BaseModel, ConfigDict
from src.models.roles import OrganizationRoles
from src.models.users import Avatar, UserSummary
from src.models.locations import LocationResponse


class OrganizationCreate(BaseModel):
    """Validate organization creation payloads."""

    # Metadata
    name: str = Field(min_length=1, max_length=128)
    avatar: str | None = None

    # Location
    location_id: UUID


class OrganizationInvitationCreate(BaseModel):
    """Validate organization invitation payloads."""

    # Metadata
    email: EmailStr

    # State
    role: OrganizationRoles


class OrganizationInvitationResponse(BaseModel):
    """Represent one organization invitation in API responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    email: str

    # State
    role: OrganizationRoles = Field(validation_alias="role_name")

    # Audit
    created_at: datetime


class ApplicationStatus(str, Enum):
    """Lifecycle states for installed applications."""

    creating = "creating"
    running = "running"
    deleting = "deleting"
    failed = "failed"


class OrganizationSummary(BaseModel):
    """Represent one organization in admin list responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    slug: str
    avatar: Avatar = ""

    # Relationships
    location_id: UUID

    # Audit
    created_at: datetime
    updated_at: datetime
    created_by: UserSummary
    updated_by: UserSummary
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None


class OrganizationApplicationResponse(BaseModel):
    """Represent one application in an organization payload."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    slug: str
    icon: str | None = None
    version: str | None = None
    sdk_version: str | None = None
    description: str | None = None

    # State
    status: ApplicationStatus

    # Audit
    created_at: datetime
    updated_at: datetime
    created_by: UserSummary
    updated_by: UserSummary
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None


class OrganizationMemberSummary(BaseModel):
    """Represent one organization member in API responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    email: str
    avatar: Avatar = ""

    # State
    role: OrganizationRoles

    # Audit
    last_access_at: datetime | None = None


class OrganizationDetails(BaseModel):
    """Represent an organization with its members."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    slug: str
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
    users: list[OrganizationMemberSummary]
    invitations: list[OrganizationInvitationResponse] = Field(default_factory=list)
    applications: list[OrganizationApplicationResponse] = Field(default_factory=list)
