from pydantic import BaseModel, Field


class EnvironmentMetadata(BaseModel):
    """Typed metadata for a single environment variable."""

    name: str
    type: str
    description: str | None = None
    required: bool


class LongLinkMetadata(BaseModel):
    """Structured metadata extracted from a built image's LongLink labels."""

    name: str | None = None
    description: str | None = None
    environments: list[EnvironmentMetadata] = Field(default_factory=list)


class ImageMetadataResponse(BaseModel):
    """Public image inspection payload returned by the API."""

    title: str | None = None
    description: str | None = None
    environments: list[EnvironmentMetadata] = Field(default_factory=list)
