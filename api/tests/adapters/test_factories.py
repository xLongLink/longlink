import pytest
from src import adapters
from uuid import UUID
from src.environments import env
from src.models.types import StorageKind
from src.database.models.storages import StorageRegistry

pytestmark = pytest.mark.no_db


def test_storage_factory_builds_exoscale_adapter(monkeypatch: pytest.MonkeyPatch) -> None:
    """Build the Exoscale adapter selected by a storage registry."""

    # Configure one Platform provisioning identity and Exoscale storage registry.
    monkeypatch.setattr(env, "EXOSCALE_API_KEY", "access-key")
    monkeypatch.setattr(env, "EXOSCALE_API_SECRET", "secret-key")
    monkeypatch.setattr(env, "EXOSCALE_ORGANIZATION_ID", UUID("11111111-1111-1111-1111-111111111111"))
    registry = StorageRegistry(
        name="exoscale",
        slug="exoscale",
        kind=StorageKind.exoscale,
        endpoint_url="https://sos-ch-gva-2.exo.io",
        runtime_endpoint_url="https://sos-ch-gva-2.exo.io",
    )

    # Build the provider selected by the storage registry.
    assert isinstance(adapters.storage(registry), adapters.Exoscale)
