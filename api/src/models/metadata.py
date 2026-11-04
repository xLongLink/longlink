from pydantic import Field, BaseModel
from src.models.types import Image
from longlink.permissions import Catalog


class EnvironmentMetadata(BaseModel):
    """Typed metadata for a single environment variable."""

    # Metadata
    name: str
    required: bool
    description: str | None = None


class LongLinkMetadata(BaseModel):
    """Structured metadata extracted from OCI and LongLink image labels."""

    # Runtime
    image: Image

    # Metadata
    version: str | None = None
    description: str | None = None

    # Relationships
    permissions: Catalog | None = None
    environments: list[EnvironmentMetadata] = Field(default_factory=list)
