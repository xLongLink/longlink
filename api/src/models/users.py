from uuid import UUID
from pydantic import Field, BaseModel, ConfigDict
from src.models.roles import PlatformRoles, OrganizationRoles
from longlink.shared.models import Email


class UserUpdate(BaseModel):
    """Payload to update mutable user profile fields."""

    # Metadata
    name: str | None = Field(default=None, min_length=1, max_length=255)
    avatar: str | None = Field(default=None, max_length=2048)


class UserIdentity(BaseModel):
    """Represent a user identity in nested API responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    email: Email
    avatar: str


class UserOrganizationSummary(BaseModel):
    """Represent a compact Organization in current-user membership responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    slug: str
    avatar: str


class UserOrganizationMembership(BaseModel):
    """Represent one current-user Organization membership."""

    model_config = ConfigDict(from_attributes=True)

    # Relationships
    organization: UserOrganizationSummary

    # Access
    role: OrganizationRoles


class UserSummary(UserIdentity):
    """Represent a compact user object in nested responses."""

    # State
    role: PlatformRoles


class UserProfile(UserSummary):
    """Represent the authenticated user payload returned by the API."""
