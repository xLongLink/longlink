from enum import StrEnum
from uuid import UUID
from typing import Literal
from datetime import datetime
from pydantic import Field, BaseModel, ConfigDict, model_validator
from src.models import pricing
from longlink.types import Email
from src.models.roles import OrganizationRoles
from src.models.users import UserIdentity
from src.models.statuses import Status

MAX_SOLUTIONS = 9


class DatabaseState(StrEnum):
    """Describe the availability of an Organization's CNPG database."""

    available = "available"
    failed = "failed"


class OrganizationCreate(BaseModel):
    """Validate organization creation payloads."""

    # Metadata
    name: str = Field(min_length=1, max_length=128)


class OrganizationUsage(BaseModel):
    """Describe current Organization usage, limits, and month-end pricing."""

    # Monthly prices
    cpu_monthly_price: int = int(pricing.CPU_MONTHLY_PRICE)
    ram_gib_monthly_price: int = int(pricing.RAM_GIB_MONTHLY_PRICE)
    storage_gib_monthly_price: int = int(pricing.STORAGE_GIB_MONTHLY_PRICE)

    # Usage and payments
    users: int = Field(ge=0)
    status: Status
    solutions: int = Field(ge=0)
    max_solutions: int = MAX_SOLUTIONS
    stripe_enabled: bool
    has_payment_method: bool

    # Independent resource pools
    storage_bytes: int
    compute_ram_bytes: int
    database_ram_bytes: int
    compute_cpu_millicores: int
    database_storage_bytes: int
    database_cpu_millicores: int


class OrganizationUsageUpdate(BaseModel):
    """Validate independently purchased resource pools."""

    model_config = ConfigDict(extra="forbid")

    # Independent resource pools
    storage_bytes: int = Field(strict=True, gt=0, le=2**53 - 1)
    compute_ram_bytes: int = Field(strict=True, ge=256 * 1024**2, le=2**53 - 1)
    database_ram_bytes: int = Field(strict=True, ge=256 * 1024**2, le=2**53 - 1)
    compute_cpu_millicores: int = Field(strict=True, ge=250, multiple_of=250, le=2**31 - 1)
    database_storage_bytes: int = Field(strict=True, ge=pricing.FREE_DATABASE_BYTES, le=2**53 - 1)
    database_cpu_millicores: int = Field(strict=True, ge=250, multiple_of=250, le=2**31 - 1)

    @model_validator(mode="after")
    def validate_price(self) -> "OrganizationUsageUpdate":
        """Keep summed pool prices within the payment provider limit."""

        # Reject capacity that cannot be charged as a Stripe CHF invoice.
        monthly_price = sum(
            pricing.allocation_amounts(
                self.compute_cpu_millicores + self.database_cpu_millicores,
                self.compute_ram_bytes + self.database_ram_bytes,
                self.storage_bytes + self.database_storage_bytes,
            )
        )
        if monthly_price > 99_999_999:
            raise ValueError("Monthly capacity price exceeds the payment provider limit")
        return self


class OrganizationByteUsage(BaseModel):
    """Report measured resource bytes against an Organization's configured capacity."""

    # Measurement
    space_used: int = Field(ge=0)

    # Capacity
    quota_bytes: int = Field(ge=0)


class OrganizationQuotasResponse(BaseModel):
    """Represent per-Organization quotas in administrator responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Database
    database_size_mib: int
    database_instances: Literal[1] = 1

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
