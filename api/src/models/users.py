from uuid import UUID
from pydantic import Field, EmailStr, BaseModel, ConfigDict
from src.models.roles import PlatformRoles, OrganizationRoles
from src.models.types import Theme, Accent, Radius, Country, Language

ACCENT_COLORS: dict[Accent, str] = {
    Accent.slate: "#64748b",
    Accent.gray: "#6b7280",
    Accent.zinc: "#71717a",
    Accent.neutral: "#737373",
    Accent.stone: "#78716c",
    Accent.red: "#ef4444",
    Accent.orange: "#f97316",
    Accent.amber: "#f59e0b",
    Accent.yellow: "#eab308",
    Accent.lime: "#84cc16",
    Accent.green: "#22c55e",
    Accent.emerald: "#10b981",
    Accent.teal: "#14b8a6",
    Accent.cyan: "#06b6d4",
    Accent.sky: "#0ea5e9",
    Accent.blue: "#3b82f6",
    Accent.indigo: "#6366f1",
    Accent.violet: "#8b5cf6",
    Accent.purple: "#a855f7",
    Accent.fuchsia: "#d946ef",
    Accent.pink: "#ec4899",
    Accent.rose: "#f43f5e",
}

ACCENT_COLOR_VALUES: tuple[str, ...] = tuple(ACCENT_COLORS.values())


class UserUpdate(BaseModel):
    """Payload to update mutable user profile fields."""

    # Metadata
    name: str | None = Field(default=None, min_length=1, max_length=255)
    avatar: str | None = Field(default=None, max_length=2048)

    # Preferences
    theme: Theme | None = None
    accent: Accent | None = None
    radius: Radius | None = None
    language: Language | None = None


class UserOrganizationMembership(BaseModel):
    """Represent one current-user organization membership."""

    # Identifier
    id: UUID

    # Metadata
    name: str
    slug: str
    avatar: str = ""
    country: Country

    # State
    role: OrganizationRoles


class UserSummary(BaseModel):
    """Represent a compact user object in nested responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    email: EmailStr
    avatar: str = ""

    # State
    role: PlatformRoles


class UserListItem(UserSummary):
    """Represent one user in admin list responses."""


class UserProfile(UserSummary):
    """Represent the authenticated user payload returned by the API."""

    # Preferences
    theme: Theme
    accent: Accent
    radius: Radius
    language: Language
