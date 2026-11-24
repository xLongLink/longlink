from typing import Annotated
from pydantic import Field, HttpUrl, BaseModel, AfterValidator


def validate_banner(value: str) -> str:
    """Require a hosted HTTPS URL without embedded credentials."""

    url = HttpUrl(value)
    if url.scheme != "https" or url.username is not None or url.password is not None:
        raise ValueError("Banner must be an HTTPS URL without credentials")
    if any(character.isspace() or not character.isprintable() for character in value):
        raise ValueError("Banner URL must not contain whitespace or control characters")
    return value


Banner = Annotated[str, Field(max_length=2048), AfterValidator(validate_banner)]


class EnvironmentMetadata(BaseModel):
    """Typed metadata for a single environment variable."""

    # Runtime metadata.
    name: str
    required: bool
    description: str | None = None
