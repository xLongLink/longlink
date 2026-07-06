from .base import Storage
from .s3 import S3
from src.models.storages import StorageKind
from src.database.models.storages import StorageRegistry


def storage_registry_adapter(registry: StorageRegistry) -> Storage:
    """Build the storage adapter for one registry record."""

    if registry.kind == StorageKind.s3:
        return S3(
            registry.protocol,
            registry.endpoint_url,
            registry.access_key_id,
            registry.secret_access_key,
        )

    raise ValueError(f"Unsupported storage registry kind '{registry.kind}'")


__all__ = ["S3", "Storage", "storage_registry_adapter"]
