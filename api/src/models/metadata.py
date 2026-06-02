from pydantic import BaseModel


class LongLinkMetadata(BaseModel):
    """Structured metadata extracted from a built image's LongLink labels."""

    name: str | None = None
    version: str | None = None
    description: str | None = None
    env_spec: dict[str, object] | None = None
