from pydantic import BaseModel


class EnvironmentMetadata(BaseModel):
    """Typed metadata for a single environment variable."""

    # Runtime metadata.
    name: str
    required: bool
    description: str | None = None
