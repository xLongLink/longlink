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
    needs_sync = "needs_sync"


class OrganizationCreate(BaseModel):
    """Validate organization creation payloads."""

    # Metadata
    name: str = Field(min_length=1, max_length=128)

    # Database
    database_idle_seconds: int | None = Field(default=None, ge=0, le=604800)

    @field_validator("database_idle_seconds")
    @classmethod
    def validate_database_idle_seconds(cls, value: int | None) -> int | None:
        """Allow never-sleep zero or a bounded idle timeout."""

        if value is not None and value != 0 and value < 60:
            raise ValueError("database_idle_seconds must be 0 or between 60 and 604800")
        return value


class DatabaseUsage(BaseModel):
    """Report database usage and configured storage per CNPG instance."""

    # Measurement
    size_bytes: int | None

    # Capacity
    allocated_bytes: int = Field(description="Configured storage bytes per database instance, not summed across replicas")


class OrganizationUpdate(BaseModel):
    """Validate mutable organization settings."""

    # Metadata
    avatar: HttpUrl | Literal[""] | None = Field(default=None, max_length=2048)

    # Database
    database_idle_seconds: int | None = Field(default=None, ge=0, le=604800)

    @field_validator("database_idle_seconds")
    @classmethod
    def validate_database_idle_seconds(cls, value: int | None) -> int | None:
        """Allow never-sleep zero or a bounded idle timeout."""

        if value is not None and value != 0 and value < 60:
            raise ValueError("database_idle_seconds must be 0 or between 60 and 604800")
        return value


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

    # Compute
    compute_cpu_limit: int
    compute_memory_limit_gib: int
    compute_ephemeral_limit_gib: int
    compute_pods: int


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
