from pydantic import Field, BaseModel, PrivateAttr


class EnvironmentMetadata(BaseModel):
    """Typed metadata for a single environment variable."""

    # Metadata
    name: str
    type: str
    required: bool
    description: str | None = None


class LongLinkMetadata(BaseModel):
    """Structured metadata extracted from a built image's LongLink labels."""

    # Runtime
    _image: str | None = PrivateAttr(default=None)

    # Metadata
    sdk: str | None = None
    title: str | None = None
    digest: str | None = None
    version: str | None = None
    description: str | None = None

    # Relationships
    environments: list[EnvironmentMetadata] = Field(default_factory=list)

    @property
    def image(self) -> str | None:
        """Return the resolved runtime image reference."""

        return self._image

    @image.setter
    def image(self, value: str | None) -> None:
        """Set the resolved runtime image reference."""

        self._image = value
