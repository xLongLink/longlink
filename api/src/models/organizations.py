from uuid import UUID
from typing import Literal
from datetime import datetime
from pydantic import Field, HttpUrl, EmailStr, BaseModel, ConfigDict
from src.models.roles import ApplicationRoles, OrganizationRoles
from src.models.users import UserSummary, UserIdentity
from src.models.statuses import Status
from src.models.resources import OrganizationApplicationSummary
from src.models.operations import OperationResponse


class OrganizationCreate(BaseModel):
    """Validate organization creation payloads."""

    # Metadata
    name: str = Field(min_length=1, max_length=128)


class OrganizationUpdate(BaseModel):
    """Validate mutable organization settings."""

    # Metadata
    avatar: HttpUrl | Literal[""] = Field(max_length=2048)


class OrganizationInvitationCreate(BaseModel):
    """Validate organization invitation payloads."""

    # Metadata
    email: EmailStr

    # State
    role: OrganizationRoles


class OrganizationMemberUpdate(BaseModel):
    """Validate organization member update payloads."""

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
    role: OrganizationRoles

    # Audit
    created_at: datetime


class OrganizationSummary(BaseModel):
    """Represent one organization in admin list responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    slug: str
    avatar: str = ""

    # Infrastructure
    compute_id: UUID
    storage_id: UUID
    database_id: UUID

    # State
    status: Status

    # Audit
    created_at: datetime
    updated_at: datetime
    created_by: UserSummary
    updated_by: UserSummary
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None


class OrganizationMutationResponse(BaseModel):
    """Pair an accepted Organization desired-state change with its infrastructure Operation.

    The operation must complete before the desired state is confirmed in managed infrastructure.
    """

    # Result
    organization: OrganizationSummary
    operation: OperationResponse


class OrganizationMemberAccessResponse(BaseModel):
    """Represent one Organization member and their access role."""

    model_config = ConfigDict(from_attributes=True)

    # Relationships
    user: UserIdentity

    # Access
    role: OrganizationRoles


class OrganizationApplicationAccessResponse(BaseModel):
    """Represent one compact LongLink Application and the current user's access role."""

    # Relationships
    application: OrganizationApplicationSummary

    # Access
    role: ApplicationRoles | None = None


class OrganizationDetails(BaseModel):
    """Represent an Organization with its members and Application access."""

    # Organization
    organization: OrganizationSummary

    # Relationships
    members: list[OrganizationMemberAccessResponse]
    invitations: list[OrganizationInvitationResponse] = Field(default_factory=list)
    applications: list[OrganizationApplicationAccessResponse] = Field(default_factory=list)
