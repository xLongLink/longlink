from enum import Enum
from uuid import UUID
from typing import Annotated
from pydantic import Field, EmailStr, BaseModel, ConfigDict, BeforeValidator
from src.models.roles import PlatformRoles, OrganizationRoles
from src.models.locations import LocationResponse


def normalize_avatar(value: str | None) -> str:
    """Convert missing avatar values into an empty string."""

    return value or ""


Avatar = Annotated[str, BeforeValidator(normalize_avatar)]


class Theme(str, Enum):
    """Supported user theme preferences."""

    system = "system"
    light = "light"
    dark = "dark"


class Accent(str, Enum):
    """Supported user accent colors from the Tailwind palette."""

    slate = "slate"
    gray = "gray"
    zinc = "zinc"
    neutral = "neutral"
    stone = "stone"
    red = "red"
    orange = "orange"
    amber = "amber"
    yellow = "yellow"
    lime = "lime"
    green = "green"
    emerald = "emerald"
    teal = "teal"
    cyan = "cyan"
    sky = "sky"
    blue = "blue"
    indigo = "indigo"
    violet = "violet"
    purple = "purple"
    fuchsia = "fuchsia"
    pink = "pink"
    rose = "rose"


class Radius(str, Enum):
    """Supported corner radius preferences."""

    none = "none"
    small = "small"
    medium = "medium"
    large = "large"


class Language(str, Enum):
    """Supported user interface languages."""

    en = "en"
    es = "es"
    fr = "fr"
    de = "de"
    it = "it"
    pt = "pt"
    nl = "nl"
    pl = "pl"
    tr = "tr"
    ar = "ar"
    zh = "zh"
    ja = "ja"
    ko = "ko"
    ru = "ru"
    hi = "hi"


class UserUpdate(BaseModel):
    """Payload to update mutable user profile fields."""

    name: str | None = None
    email: EmailStr | None = None
    avatar: str | None = None
    theme: Theme | None = None
    accent: Accent | None = None
    radius: Radius | None = None
    language: Language | None = None


class UserOrganizationMembership(BaseModel):
    """Represent one organization membership in the user profile."""

    # Identifier
    id: UUID

    # Metadata
    name: str
    avatar: Avatar = ""
    location: LocationResponse

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
    avatar: Avatar = ""

    # State
    role: PlatformRoles


class UserListItem(UserSummary):
    """Represent one user in admin list responses."""

    oidc: str


class UserProfile(UserSummary):
    """Represent the authenticated user payload returned by the API."""

    # Preferences
    theme: Theme
    accent: Accent
    radius: Radius
    language: Language

    # Identity
    oidc: str

    # Relationships
    organizations: list[UserOrganizationMembership] = Field(default_factory=list)
