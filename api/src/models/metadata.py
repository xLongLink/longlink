from pydantic import Field, BaseModel


class EnvironmentMetadata(BaseModel):
    """Typed metadata for a single environment variable."""

    # Metadata
    name: str
    type: str
    required: bool
    description: str | None = None


class LongLinkMetadata(BaseModel):
    """Structured metadata extracted from a built image's LongLink labels."""

    # Metadata
    sdk: str | None = None
    name: str | None = None
    version: str | None = None
    description: str | None = None

    # Relationships
    environments: list[EnvironmentMetadata] = Field(default_factory=list)


class ImageMetadataResponse(BaseModel):
    """Public image inspection payload returned by the API."""

    # Metadata
    sdk: str | None = None
    name: str | None = None
    version: str | None = None
    description: str | None = None

    # Relationships
    environments: list[EnvironmentMetadata] = Field(default_factory=list)
