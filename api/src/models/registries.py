from uuid import UUID
from typing import Literal
from pydantic import Field, BaseModel, SecretStr, ConfigDict


class RegistryCreate(BaseModel):
    """Validate the registry provider and write-only credentials."""

    # Connection
    provider: Literal["ghcr"] = "ghcr"
    credential: SecretStr = Field(min_length=1, max_length=4096)


class RegistryResponse(BaseModel):
    """Expose registry connection identity without encrypted credentials."""

    model_config = ConfigDict(from_attributes=True)

    # Connection
    id: UUID
    host: str
    provider: Literal["ghcr"]
    username: str
