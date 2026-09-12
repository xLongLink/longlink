from enum import StrEnum
from uuid import UUID
from typing import Literal
from datetime import datetime
from pydantic import Field, HttpUrl, BaseModel, ConfigDict, field_validator
from src.models.roles import OrganizationRoles
from src.models.users import UserIdentity
from src.models.resources import OrganizationIdentity
from longlink.shared.models import Email


class DatabaseState(StrEnum):
    """Describe the availability of an Organization's CNPG database."""

    available = "available"
    hibernating = "hibernating"
    hibernated = "hibernated"
    resuming = "resuming"
    failed = "failed"


class OrganizationCreate(BaseModel):
    """Validate organization creation payloads."""

    # Metadata
    name: str = Field(min_length=1, max_length=128)


class DatabaseUsage(BaseModel):
    """Report timestamped database usage and configured storage per CNPG instance."""

    # Measurement
    size_bytes: int | None
    measured_at: datetime | None

    # Capacity
    allocated_bytes: int = Field(description="Configured storage bytes per database instance, not summed across replicas")


class OrganizationUpdate(BaseModel):
    """Validate mutable organization settings."""

    # Metadata
    avatar: HttpUrl | Literal[""] | None = Field(default=None, max_length=2048)

    # Database
    database_idle_seconds: int | None = Field(default=None, ge=0, le=604800, strict=True)

    @field_validator("database_idle_seconds")
    @classmethod
    def validate_database_idle_seconds(cls, value: int | None) -> int | None:
        """Keep databases always on unless hibernation has a meaningful idle interval."""

        # Avoid repeated sleep/wake cycles from accidentally tiny idle settings.
        if value is not None and 0 < value < 300:
            raise ValueError("Database idle seconds must be 0 (always on) or at least 300")
        return value


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


class OrganizationSummary(OrganizationIdentity):
    """Represent one organization in admin list responses."""

    # Database
    database_state: DatabaseState
    database_idle_seconds: int


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
    organization: OrganizationSummary

    # Relationships
    members: list[OrganizationMemberAccessResponse]
    invitations: list[OrganizationInvitationResponse]
