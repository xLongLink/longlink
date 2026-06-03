from pydantic import BaseModel


class LongLinkMetadata(BaseModel):
    """Structured metadata extracted from a built image's LongLink labels."""

    name: str | None = None
    description: str | None = None
    required: list[str] | None = None
    optional: list[str] | None = None
