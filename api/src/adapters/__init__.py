from .storage import MinIO, Storage, Exoscale
from .database import Database, Postgres, DatabaseRuntimeConnection
from .storage.base import StorageRuntimeCredentials
from src.environments import env
from src.models.storages import StorageKind
from src.models.databases import DatabaseKind
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry


def database(registry: DatabaseRegistry) -> Database:
    """Build the database adapter for one registry record."""

    # Select the PostgreSQL adapter for supported database registries.
    if registry.kind == DatabaseKind.postgresql:
        return Postgres(
            registry.host,
            registry.port,
            registry.username,
            registry.password,
        )

    raise ValueError(f"Unsupported database registry kind '{registry.kind}'")


def storage(registry: StorageRegistry) -> Storage:
    """Build the storage adapter for one registry record."""

    # Select the MinIO adapter for local development storage registries.
    if registry.kind == StorageKind.minio:
        if not env.DEVELOPMENT:
            raise ValueError("MinIO storage is supported only for local development")
        return MinIO(
            registry.endpoint_url,
            registry.access_key_id,
            registry.secret_access_key,
        )

    # Select the Exoscale adapter for SOS storage registries.
    if registry.kind == StorageKind.exoscale:
        return Exoscale(
            registry.endpoint_url,
            registry.access_key_id,
            registry.secret_access_key,
        )

    raise ValueError(f"Unsupported storage registry kind '{registry.kind}'")
