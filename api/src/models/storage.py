from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from src.models.kinds import StorageKind
from src.models.users import UserSummary


class StorageRegistryCreate(BaseModel):
    """Request body for creating a storage registry."""

    kind: StorageKind
    name: str
    protocol: str
    endpoint_url: str
    access_key_id: str
    secret_access_key: str
    location_id: UUID


class StorageRegistryResponse(BaseModel):
    """Represent one storage registry in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    kind: StorageKind
    name: str
    protocol: str
    endpoint_url: str
    access_key_id: str
    location_id: UUID
    created_at: datetime
    created_by: UserSummary | None = None
    updated_at: datetime
    updated_by: UserSummary | None = None
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None
