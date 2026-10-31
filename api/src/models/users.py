from uuid import UUID
from typing import Literal
from datetime import datetime
from pydantic import Field, BaseModel, ConfigDict
from longlink.types import Email
from src.models.roles import OrganizationRoles
from src.models.resources import OrganizationIdentity

ThemeMode = Literal["system", "light", "dark"]
NavigationLayout = Literal["topbar", "sidebar"]
AccentColor = Literal[
    "neutral",
    "red",
    "orange",
    "amber",
    "yellow",
    "lime",
    "green",
    "emerald",
    "teal",
    "cyan",
    "sky",
    "blue",
    "indigo",
    "violet",
    "purple",
    "fuchsia",
    "pink",
    "rose",
]


class UserUpdate(BaseModel):
    """Payload to update mutable user profile fields."""

    # Metadata
    name: str | None = Field(default=None, min_length=1, max_length=255)
    avatar: str | None = Field(default=None, max_length=2048)

    # Appearance
    theme: ThemeMode | None = None
    accent: AccentColor | None = None
    navigation: NavigationLayout | None = None


class UserIdentity(BaseModel):
    """Represent a user identity in nested API responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    email: Email
    avatar: str


class UserOrganizationMembership(BaseModel):
    """Represent one current-user Organization membership."""

    model_config = ConfigDict(from_attributes=True)

    # Relationships
    organization: OrganizationIdentity

    # Access
    role: OrganizationRoles


class UserOrganizationInvitation(BaseModel):
    """Represent one pending Organization invitation for the current user."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Relationships
    organization: OrganizationIdentity

    # Access
    role: OrganizationRoles


class UserSummary(UserIdentity):
    """Represent a compact user object in nested responses."""

    # State
    administrator: bool


class CurrentUser(UserSummary):
    """Include personal preferences only in the account's own profile."""

    # Appearance
    theme: ThemeMode
    accent: AccentColor
    navigation: NavigationLayout


class AdminUserSummary(UserSummary):
    """Represent a user with its creation time for platform administrators."""

    # Timestamps
    created_at: datetime
