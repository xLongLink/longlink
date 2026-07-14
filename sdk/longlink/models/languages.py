from enum import StrEnum


class Language(StrEnum):
    """Supported user interface languages."""

    en = "en"
    it = "it"


DEFAULT_LANGUAGE = Language.en
