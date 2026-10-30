from enum import StrEnum
from uuid import UUID
from datetime import datetime
from pydantic import Field, BaseModel, ConfigDict
from longlink.types import Email
from src.models.roles import OrganizationRoles
from src.models.users import UserIdentity
from src.models.pricing import UsageRates

MAX_SOLUTIONS = 9


class DatabaseState(StrEnum):
    """Describe the availability of an Organization's CNPG database."""

    available = "available"
    failed = "failed"


class OrganizationCreate(BaseModel):
    """Validate organization creation payloads."""

    # Metadata
    name: str = Field(min_length=1, max_length=128)


class OrganizationUsage(UsageRates):
    """Describe current Organization usage, limits, and month-end pricing."""

    # Usage and payments
    users: int = Field(ge=0)
    solutions: int = Field(ge=0)
    max_solutions: int = MAX_SOLUTIONS
    stripe_enabled: bool
    has_payment_method: bool


class OrganizationByteUsage(BaseModel):
    """Report measured resource bytes against an Organization's configured capacity."""

    # Measurement
    space_used: int = Field(ge=0)

    # Capacity
    quota_bytes: int = Field(ge=0)


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
