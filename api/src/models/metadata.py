from pydantic import BaseModel, Field


class EnvironmentMetadata(BaseModel):
    """Typed metadata for a single environment variable."""

    name: str
    type: str
    description: str | None = None


class LongLinkMetadata(BaseModel):
    """Structured metadata extracted from a built image's LongLink labels."""

    name: str | None = None
    description: str | None = None
    required: EnvironmentMetadata | None = None
    optional: EnvironmentMetadata | None = None


class ImageMetadataResponse(BaseModel):
    """Public image inspection payload returned by the API."""

    title: str | None = None
    description: str | None = None
    required_envs: list[EnvironmentMetadata] = Field(default_factory=list)
