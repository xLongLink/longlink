from enum import StrEnum
from uuid import UUID
from datetime import datetime
from pydantic import Field, BaseModel, ConfigDict
from src.models.roles import OrganizationRoles
from src.models.users import UserIdentity
from src.models.resources import OrganizationIdentity
from longlink.shared.models import Email


class DatabaseState(StrEnum):
    """Describe the availability of an Organization's CNPG database."""

    available = "available"
    failed = "failed"


class OrganizationCreate(BaseModel):
    """Validate organization creation payloads."""

    # Metadata
    name: str = Field(min_length=1, max_length=128)


class OrganizationQuotasResponse(BaseModel):
    """Represent stored per-Organization quotas in administrator responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Database
    database_size_mib: int
    database_instances: int

    # Storage
    storage_quota_bytes: int


class OrganizationInvitationCreate(BaseModel):
    """Validate organization invitation payloads."""

    # Metadata
    email: Email

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


class OrganizationMemberAccessResponse(BaseModel):
    """Represent one Organization member and their access role."""

    model_config = ConfigDict(from_attributes=True)

    # Relationships
    user: UserIdentity

    # Access
    role: OrganizationRoles


class OrganizationDetails(BaseModel):
    """Represent an Organization with its member access."""

    # Organization
    organization: OrganizationIdentity

    # Relationships
    members: list[OrganizationMemberAccessResponse]
    invitations: list[OrganizationInvitationResponse]
