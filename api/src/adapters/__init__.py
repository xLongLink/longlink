from .storage import MinIO, Storage, Exoscale
from .postgres import Postgres
from .storage.base import StorageRuntimeCredentials
from src.environments import env
from src.models.types import StorageKind
from src.database.models.storages import StorageRegistry


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
