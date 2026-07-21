import pytest
from src import adapters
from src.models.types import StorageKind
from src.database.models.storages import StorageRegistry

pytestmark = pytest.mark.no_db


def test_storage_factory_builds_minio_adapter() -> None:
    """Build the MinIO adapter selected by a development storage registry."""

    # Create one development storage registry.
    registry = StorageRegistry(
        name="minio",
        slug="minio",
        kind=StorageKind.minio,
        endpoint_url="https://storage.example.test",
        access_key_id="access-key",
        secret_access_key="secret-key",
        runtime_endpoint_url="https://storage.example.test",
    )

    # Build the provider selected by the storage registry.
    assert isinstance(adapters.storage(registry), adapters.MinIO)
