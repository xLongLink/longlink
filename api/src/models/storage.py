from pydantic import BaseModel

from src.models.kinds import StorageKind


class StorageRegistryCreate(BaseModel):
    """Request body for creating a storage registry."""

    kind: StorageKind
    name: str
    protocol: str
    endpoint_url: str
    access_key_id: str
    secret_access_key: str
    location_id: int


class StorageRegistryResponse(BaseModel):
    """Represent one storage registry in API responses."""

    id: int
    kind: StorageKind
    name: str
    protocol: str
    endpoint_url: str
    access_key_id: str
    location_id: int


class StorageUsageResponse(BaseModel):
    """Represent storage usage in API responses."""

    used_bytes: int


class StorageQuotaResponse(BaseModel):
    """Represent storage quota in API responses."""

    quota_bytes: int | None = None
