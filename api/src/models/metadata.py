from pydantic import Field, BaseModel, RootModel, StrictStr
from src.models.types import Image


class EnvironmentMetadata(BaseModel):
    """Typed metadata for a single environment variable."""

    # Metadata
    name: str
    required: bool
    description: str | None = None


class ImageLabels(RootModel[dict[StrictStr, StrictStr]]):
    """Strict OCI image labels."""


class LongLinkMetadata(BaseModel):
    """Structured metadata extracted from OCI and LongLink image labels."""

    # Runtime
    image: Image = Field(exclude=True)

    # Metadata
    description: str | None = None

    # Relationships
    environments: list[EnvironmentMetadata] = Field(default_factory=list)
