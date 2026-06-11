from datetime import datetime
from pydantic import BaseModel, ConfigDict
from src.models.kinds import DatabaseKind
from src.models.users import UserSummary


class DatabaseRegistryCreate(BaseModel):
    """Request body for creating a database registry."""

    kind: DatabaseKind
    name: str
    host: str
    port: int
    username: str
    password: str
    location_id: int


class DatabaseRegistryResponse(BaseModel):
    """Represent one database registry in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: DatabaseKind
    name: str
    host: str
    port: int
    username: str
    location_id: int
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None
