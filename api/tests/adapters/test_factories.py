import pytest
from src import adapters
from uuid import UUID
from collections.abc import Callable
from src.models.storages import StorageKind
from src.models.databases import DatabaseKind
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry

pytestmark = pytest.mark.no_db

FACTORY_CASES = [
    pytest.param(
        DatabaseRegistry(
            name="postgres",
            slug="postgres",
            kind=DatabaseKind.postgresql,
            host="db.example.test",
            port=5432,
            username="admin",
            password="secret",
            location_id=UUID("11111111-1111-4111-8111-111111111111"),
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
            location_id=UUID("11111111-1111-4111-8111-111111111111"),
        ),
        adapters.storage,
        adapters.MinIO,
        id="minio",
    ),
]


@pytest.mark.parametrize(("registry", "factory", "expected_type"), FACTORY_CASES)
def test_factory_builds_backend_adapter(
    registry: DatabaseRegistry | StorageRegistry,
    factory: Callable[[DatabaseRegistry | StorageRegistry], adapters.Database | adapters.Storage],
    expected_type: type[adapters.Database] | type[adapters.Storage],
) -> None:
    """Build the expected adapter for each supported backend registry kind."""

    assert isinstance(factory(registry), expected_type)
