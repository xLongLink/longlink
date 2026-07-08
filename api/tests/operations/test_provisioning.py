import pytest
from src import adapters
from types import SimpleNamespace
from typing import cast
from src.operations.provisioning import runtime_environment
from src.database.models.storages import StorageRegistry

pytestmark = pytest.mark.no_db


def test_runtime_environment_uses_separate_connection_credentials() -> None:
    """Build runtime envs with endpoint and credentials in separate values."""

    registry = cast(
        StorageRegistry,
        SimpleNamespace(
            endpoint_url="https://storage.control.longlink.internal",
            runtime_endpoint_url="http://storage.runtime.longlink.internal:19000",
        ),
    )
    database_connection: adapters.DatabaseRuntimeConnection = {
        "host": "database.longlink.internal",
        "port": 5432,
        "password": "database-secret",
        "username": "dashboard-role",
        "database_name": "longlink_acme",
    }
    credentials: adapters.StorageRuntimeCredentials = {
        "access_key_id": "access/key",
        "secret_access_key": "secret@key",
    }

    assert runtime_environment(
        "dashboard",
        database_connection,
        registry,
        "longlink-acme-dashboard",
        "longlink-acme-shared",
        credentials,
    ) == {
        "LONGLINK_ENV": "production",
        "LONGLINK_DATABASE_HOST": "database.longlink.internal",
        "LONGLINK_DATABASE_NAME": "longlink_acme",
        "LONGLINK_DATABASE_PASSWORD": "database-secret",
        "LONGLINK_DATABASE_PORT": "5432",
        "LONGLINK_DATABASE_SCHEMA": "dashboard",
        "LONGLINK_DATABASE_USERNAME": "dashboard-role",
        "LONGLINK_STORAGE_BUCKET": "longlink-acme-dashboard",
        "LONGLINK_STORAGE_ENDPOINT_URL": "http://storage.runtime.longlink.internal:19000",
        "LONGLINK_STORAGE_PASSWORD": "secret@key",
        "LONGLINK_STORAGE_SHARED_BUCKET": "longlink-acme-shared",
        "LONGLINK_STORAGE_USERNAME": "access/key",
    }


def test_runtime_environment_requires_storage_credentials() -> None:
    """Reject storage runtime env creation without scoped credentials."""

    registry = cast(
        StorageRegistry,
        SimpleNamespace(
            endpoint_url="https://storage.control.longlink.internal",
            runtime_endpoint_url="http://storage.runtime.longlink.internal:19000",
        ),
    )
    database_connection: adapters.DatabaseRuntimeConnection = {
        "host": "database.longlink.internal",
        "port": 5432,
        "password": "database-secret",
        "username": "dashboard-role",
        "database_name": "longlink_acme",
    }

    with pytest.raises(ValueError, match="Storage runtime credentials"):
        runtime_environment("dashboard", database_connection, registry)
