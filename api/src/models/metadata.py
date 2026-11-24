from pydantic import Field, BaseModel
from src.models.types import Image
from longlink.metadata import Banner, EnvironmentMetadata
from longlink.permissions import Catalog


class LongLinkMetadata(BaseModel):
    """Structured metadata extracted from OCI and LongLink image labels."""

    # Runtime
    image: Image

    # Metadata
    banner: Banner | None = None
    version: str | None = None
    description: str | None = None

    # Relationships
    permissions: Catalog | None = None
    environments: list[EnvironmentMetadata] = Field(default_factory=list)
