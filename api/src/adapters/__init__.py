from .storage import Storage, Exoscale
from .postgres import Postgres
from .storage.base import StorageRuntimeCredentials
from src.environments import env
from src.database.models.storages import StorageRegistry


def storage(registry: StorageRegistry) -> Storage:
    """Construct the Exoscale storage provider for one registry.

    Platform credentials provision resources; provider adapters define the narrower runtime credential contract.
    """

    # Use the Platform provisioning identity while Applications receive scoped credentials.
    access_key_id, secret_access_key, organization_id = env.exoscale()
    return Exoscale(
        registry.endpoint_url,
        access_key_id,
        secret_access_key,
        organization_id,
    )
