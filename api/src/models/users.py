from enum import Enum
from pydantic import BaseModel, EmailStr, Field, field_validator

from src.models.roles import RoleName


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


class UserOrgMembership(BaseModel):
    """Represent one organization membership in the user profile."""

    name: str
    role: RoleName


class UserSummary(BaseModel):
    """Represent a compact user object in nested responses."""

    id: int
    name: str
    email: EmailStr
    avatar: str = ""

    @field_validator("avatar", mode="before")
    @classmethod
    def normalize_avatar(cls, value: str | None) -> str:
        """Default missing avatar URLs to an empty string."""

        return value or ""


class UserProfile(BaseModel):
    """Represent the authenticated user payload returned by the API."""

    id: int
    name: str
    email: EmailStr
    avatar: str = ""
    theme: Theme
    accent: Accent
    radius: Radius
    language: Language
    oidc_subject: str | None = None
    orgs: list[UserOrgMembership] = Field(default_factory=list)

    @field_validator("avatar", mode="before")
    @classmethod
    def normalize_avatar(cls, value: str | None) -> str:
        """Default missing avatar URLs to an empty string."""

        return value or ""
