from .storage import Storage, Exoscale
from .postgres import Postgres
from .storage.base import StorageRuntimeCredentials
from src.database.models.storages import StorageRegistry


def storage(registry: StorageRegistry) -> Storage:
    """Construct the Exoscale storage provider for one registry.

    Registry credentials provision resources; provider adapters define the narrower runtime credential contract.
    """

    # Use the registry provisioning identity while Applications receive scoped credentials.
    return Exoscale(
        registry.endpoint_url,
        registry.access_key_id,
        registry.secret_access_key,
    )
