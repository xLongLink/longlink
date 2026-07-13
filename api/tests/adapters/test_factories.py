import pytest
from src import adapters
from uuid import UUID
from src.models.storages import StorageKind
from src.models.databases import DatabaseKind
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry

pytestmark = pytest.mark.no_db


def test_database_factory_builds_postgres_adapter() -> None:
    """Build a PostgreSQL adapter from a registry record."""

    registry = DatabaseRegistry(
        name="postgres",
        slug="postgres",
        kind=DatabaseKind.postgresql,
        host="db.example.test",
        port=5432,
        username="admin",
        password="secret",
        location_id=UUID("11111111-1111-4111-8111-111111111111"),
    )

    assert isinstance(adapters.database(registry), adapters.Postgres)


def test_storage_factory_builds_minio_adapter() -> None:
    """Build a MinIO adapter from a registry record."""

    registry = StorageRegistry(
        name="minio",
        slug="minio",
        kind=StorageKind.minio,
        endpoint_url="https://storage.example.test",
        access_key_id="access-key",
        secret_access_key="secret-key",
        runtime_endpoint_url="https://storage.example.test",
        location_id=UUID("11111111-1111-4111-8111-111111111111"),
    )

    assert isinstance(adapters.storage(registry), adapters.MinIO)
