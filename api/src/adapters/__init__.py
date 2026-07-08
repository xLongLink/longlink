from .storage import S3, Storage
from .database import Database, Postgres
from .storage.base import StorageRuntimeCredentials
from src.models.storages import StorageKind
from src.models.databases import DatabaseKind
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry


def database(registry: DatabaseRegistry) -> Database:
    """Build the database adapter for one registry record."""

    if registry.kind == DatabaseKind.postgresql:
        return Postgres(
            registry.host,
            registry.port,
            registry.username,
            registry.password,
            runtime_host=registry.runtime_host,
            runtime_port=registry.runtime_port,
        )

    raise ValueError(f"Unsupported database registry kind '{registry.kind}'")


def storage(registry: StorageRegistry) -> Storage:
    """Build the storage adapter for one registry record."""

    if registry.kind == StorageKind.s3:
        return S3(
            registry.protocol,
            registry.endpoint_url,
            registry.access_key_id,
            registry.secret_access_key,
        )

    raise ValueError(f"Unsupported storage registry kind '{registry.kind}'")
