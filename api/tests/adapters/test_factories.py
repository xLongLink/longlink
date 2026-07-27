import pytest
from src import adapters
from src.database.models.storages import StorageRegistry

pytestmark = pytest.mark.no_db


def test_storage_factory_builds_exoscale_adapter() -> None:
    """Build the Exoscale adapter selected by a storage registry."""

    # Configure one independently credentialed Exoscale storage registry.
    registry = StorageRegistry(
        name="exoscale",
        slug="exoscale",
        endpoint_url="https://sos-ch-gva-2.exo.io",
        access_key_id="access-key",
        secret_access_key="secret-key",
    )

    # Build the provider selected by the storage registry.
    assert isinstance(adapters.storage(registry), adapters.Exoscale)
