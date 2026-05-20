from enum import Enum

from pydantic import BaseModel, EmailStr


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
