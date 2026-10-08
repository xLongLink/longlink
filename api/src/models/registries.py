from enum import StrEnum
from uuid import UUID
from pydantic import Field, BaseModel, SecretStr, ConfigDict


class RegistryProvider(StrEnum):
    """Identify supported container registry authentication providers."""

    ghcr = "ghcr"

    @property
    def host(self) -> str:
        """Trusted registry host for this provider."""

        return "ghcr.io"


class RegistryCreate(BaseModel):
    """Validate write-only GHCR credentials without a provider selector."""

    model_config = ConfigDict(extra="forbid")

    # Connection
    credential: SecretStr = Field(min_length=1, max_length=4096)


class RegistryResponse(BaseModel):
    """Expose registry connection identity without encrypted credentials."""

    model_config = ConfigDict(from_attributes=True)

    # Connection
    id: UUID
    host: str
    provider: RegistryProvider
    username: str
