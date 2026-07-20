import pytest
from src import adapters
from collections.abc import Callable
from src.models.types import StorageKind
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry

pytestmark = pytest.mark.no_db

FACTORY_CASES = [
    pytest.param(
        DatabaseRegistry(
            name="postgres",
            slug="postgres",
            host="db.example.test",
            port=5432,
            username="admin",
            password="secret",
        ),
        adapters.database,
        adapters.Postgres,
        id="postgresql",
    ),
    pytest.param(
        StorageRegistry(
            name="minio",
            slug="minio",
            kind=StorageKind.minio,
            endpoint_url="https://storage.example.test",
            access_key_id="access-key",
            secret_access_key="secret-key",
            runtime_endpoint_url="https://storage.example.test",
        ),
        adapters.storage,
        adapters.MinIO,
        id="minio",
    ),
]


@pytest.mark.parametrize(("registry", "factory", "expected_type"), FACTORY_CASES)
def test_factory_builds_backend_adapter(
    registry: DatabaseRegistry | StorageRegistry,
    factory: Callable[..., object],
    expected_type: type[object],
) -> None:
    """Build the expected adapter for each supported backend registry kind."""

    assert isinstance(factory(registry), expected_type)
