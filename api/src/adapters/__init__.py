from .storage import MinIO, Storage, Exoscale
from .database import Database, Postgres, DatabaseRuntimeConnection
from .storage.base import StorageRuntimeCredentials
from src.environments import env
from src.models.storages import StorageKind
from src.models.databases import DatabaseKind
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry


def database(registry: DatabaseRegistry) -> Database:
    """Construct the provisioning adapter selected by one database registry record.

    Registry credentials remain at this control-plane boundary instead of being returned as runtime connection material.
    """

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
    """Construct the storage provider selected by a registry record, enforcing development-only MinIO at this boundary.

    Registry credentials provision resources; provider adapters define the narrower runtime credential contract.
    """

    # Select the MinIO adapter for local development storage registries.
    if registry.kind == StorageKind.minio:
        if not env.DEVELOPMENT:
            raise ValueError("MinIO storage is supported only for local development")
        if registry.access_key_id is None or registry.secret_access_key is None:
            raise ValueError("MinIO storage registry credentials are missing")
        return MinIO(
            registry.endpoint_url,
            registry.access_key_id,
            registry.secret_access_key,
        )

    # Select the Exoscale adapter for SOS storage registries.
    if registry.kind == StorageKind.exoscale:
        access_key_id, secret_access_key, organization_id = env.exoscale()
        return Exoscale(
            registry.endpoint_url,
            access_key_id,
            secret_access_key,
            organization_id,
        )

    raise ValueError(f"Unsupported storage registry kind '{registry.kind}'")
