import re
import pycountry
import urllib.parse
from enum import StrEnum
from typing import Self
from pydantic import GetCoreSchemaHandler
from pydantic_core import CoreSchema, core_schema
from longlink.models.icons import Icon
from longlink.models.languages import Language

IMAGE_NAME_COMPONENT_PATTERN = re.compile(r"^[a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*$")
IMAGE_TAG_PATTERN = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$")
IMAGE_DIGEST_PATTERN = re.compile(r"^[A-Za-z][A-Za-z0-9]*(?:[+._-][A-Za-z][A-Za-z0-9]*)*:[A-Za-z0-9=_+.-]+$")


class DatabaseSSLMode(StrEnum):
    """Supported PostgreSQL SSL modes."""

    disable = "disable"
    allow = "allow"
    prefer = "prefer"
    require = "require"
    verify_ca = "verify-ca"
    verify_full = "verify-full"


DATABASE_SSL_MODES = frozenset(mode.value for mode in DatabaseSSLMode)


class StorageKind(StrEnum):
    """Supported storage backend kinds."""

    exoscale = "exoscale"


class Theme(StrEnum):
    """Supported user theme preferences."""

    system = "system"
    light = "light"
    dark = "dark"


class Accent(StrEnum):
    """Supported randomized LongLink logo accent colors."""

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


class Country(str):
    """Represent one exact ISO 3166-1 alpha-2 country code."""

    def __new__(cls, code: str) -> Self:
        """Validate and construct one country code."""

        # Preserve already-validated values across API and response boundaries.
        if isinstance(code, cls):
            return code

        # Require the exact uppercase representation returned by the country options API.
        if len(code) != 2 or not code.isascii() or not code.isalpha() or code != code.upper():
            raise ValueError("Country must be an uppercase ISO 3166-1 alpha-2 code")
        if pycountry.countries.get(alpha_2=code) is None:
            raise ValueError("Country must be an uppercase ISO 3166-1 alpha-2 code")

        return str.__new__(cls, code)

    @classmethod
    def __get_pydantic_core_schema__(cls, _source_type: object, _handler: GetCoreSchemaHandler) -> CoreSchema:
        """Expose countries as validated strings in Pydantic and OpenAPI schemas."""

        return core_schema.no_info_after_validator_function(
            cls,
            core_schema.str_schema(min_length=2, max_length=2, pattern=r"^[A-Z]{2}$"),
            serialization=core_schema.to_string_ser_schema(),
        )


class Image(str):
    """Represent one validated fully-qualified OCI image reference."""

    registry: str
    repository: str
    tag_or_digest: str

    def __new__(cls, image: str) -> Self:
        """Parse and validate one fully-qualified OCI image reference."""

        # Preserve already-validated values across API and service boundaries.
        if isinstance(image, cls):
            return image

        value = image.strip()

        # Require one bounded plain reference rather than a URL.
        if not value:
            raise ValueError("Image reference is required")
        if len(value) > 255:
            raise ValueError("Image reference is too long")
        if value.startswith("//") or "://" in value:
            raise ValueError("Image reference must not be a URL")
        if any(character.isspace() or ord(character) < 32 or ord(character) == 127 for character in value):
            raise ValueError("Image reference contains invalid characters")

        registry, separator, remainder = value.partition("/")

        # Require an explicit registry host.
        if not separator:
            raise ValueError("Image registry host is required")

        # Parse digest references separately from tags.
        if "@" in remainder:
            repository, _separator, tag_or_digest = remainder.partition("@")
            if not IMAGE_DIGEST_PATTERN.fullmatch(tag_or_digest):
                raise ValueError("Image digest is invalid")
        else:
            repository, separator, tag_or_digest = remainder.rpartition(":")
            if not separator:
                raise ValueError("Image reference tag or digest is required")
            if not IMAGE_TAG_PATTERN.fullmatch(tag_or_digest):
                raise ValueError("Image tag is invalid")

        parsed_registry = urllib.parse.urlsplit(f"//{registry}")

        # Reject malformed registry hosts, credentials, and ports.
        if parsed_registry.hostname is None or parsed_registry.username or parsed_registry.password:
            raise ValueError("Image registry is invalid")
        try:
            parsed_registry.port
        except ValueError as exc:
            raise ValueError("Image registry port is invalid") from exc

        # Require valid repository path components.
        if not repository or any(not IMAGE_NAME_COMPONENT_PATTERN.fullmatch(component) for component in repository.split("/")):
            raise ValueError("Image repository is invalid")

        reference = str.__new__(cls, value)
        reference.registry = registry
        reference.repository = repository
        reference.tag_or_digest = tag_or_digest
        return reference

    @property
    def value(self) -> str:
        """Return the normalized string representation for persistence."""

        return str(self)

    @classmethod
    def __get_pydantic_core_schema__(cls, _source_type: object, _handler: GetCoreSchemaHandler) -> CoreSchema:
        """Expose the image as a validated string in Pydantic and OpenAPI schemas."""

        return core_schema.no_info_after_validator_function(
            cls,
            core_schema.str_schema(),
            serialization=core_schema.to_string_ser_schema(),
        )
