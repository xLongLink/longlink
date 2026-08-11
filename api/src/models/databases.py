from uuid import UUID
from pydantic import Field, BaseModel, ConfigDict
from src.models.types import DatabaseSSLMode
from src.models.infrastructure import DatabaseConfiguration


class DatabaseRegistryCreate(DatabaseConfiguration):
    """Validate one database registry creation payload."""

    # Metadata
    name: str = Field(min_length=1, max_length=128)

class DatabaseRegistryResponse(BaseModel):
    """Describe one database backend while filtering its administrator password.

    Non-secret connection metadata remains available for administrator diagnostics.
    """

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str

    # Connection
    host: str
    port: int
    sslmode: DatabaseSSLMode
    username: str
