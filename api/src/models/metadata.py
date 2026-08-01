from pydantic import Field, BaseModel


class EnvironmentMetadata(BaseModel):
    """Typed metadata for a single environment variable."""

    # Metadata
    name: str
    type: str
    required: bool
    description: str | None = None


class LongLinkMetadata(BaseModel):
    """Structured metadata extracted from OCI and LongLink image labels."""

    # Runtime
    image: str = Field(exclude=True)

    # Metadata
    title: str | None = None
    digest: str | None = None
    version: str | None = None
    description: str | None = None

    # Relationships
    environments: list[EnvironmentMetadata] = Field(default_factory=list)
