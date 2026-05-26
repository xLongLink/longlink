from pydantic import BaseModel


class StorageRegistryCreate(BaseModel):
    """Request body for creating a storage registry."""

    name: str
    protocol: str
    endpoint_url: str
    access_key_id: str
    secret_access_key: str


class StorageRegistryResponse(BaseModel):
    """Represent one storage registry in API responses."""

    name: str
    protocol: str
    endpoint_url: str
    access_key_id: str
