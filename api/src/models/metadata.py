from pydantic import BaseModel


class EnvironmentMetadata(BaseModel):
    """Typed metadata for a single environment variable."""

    name: str
    type: str


class LongLinkMetadata(BaseModel):
    """Structured metadata extracted from a built image's LongLink labels."""

    name: str | None = None
    description: str | None = None
    required: EnvironmentMetadata | None = None
    optional: EnvironmentMetadata | None = None
