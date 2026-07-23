from uuid import uuid4
from datetime import UTC, datetime
import pytest
from pydantic import ValidationError
from src.models.types import StorageKind
from src.models.storages import StorageRegistryCreate, StorageRegistryResponse

pytestmark = pytest.mark.no_db


def test_storage_registry_create_accepts_exoscale_endpoint_payload() -> None:
    """Accept the Exoscale storage registry payload submitted by the Platform UI."""

    # Validate and normalize storage endpoint URLs at the model boundary.
    payload = StorageRegistryCreate.model_validate(
        {
            "kind": "exoscale",
            "name": "Primary Storage",
            "endpoint_url": "https://sos-ch-gva-2.exo.io/",
            "runtime_endpoint_url": None,
        }
    )

    assert payload.kind == StorageKind.exoscale
    assert payload.name == "Primary Storage"
    assert payload.endpoint_url == "https://sos-ch-gva-2.exo.io"
    assert payload.runtime_endpoint_url is None


@pytest.mark.parametrize(
    "payload",
    [
        {"kind": "exoscale", "name": "", "endpoint_url": "https://sos-ch-gva-2.exo.io"},
        {"kind": "exoscale", "name": "Primary Storage", "endpoint_url": "http://sos-ch-gva-2.exo.io"},
        {
            "kind": "exoscale",
            "name": "Primary Storage",
            "endpoint_url": "https://sos-ch-gva-2.exo.io",
            "runtime_endpoint_url": "https://sos-de-fra-1.exo.io",
        },
    ],
)
def test_storage_registry_create_rejects_invalid_endpoint_payload(payload: dict[str, object]) -> None:
    """Reject storage registry payloads that cannot identify a supported Exoscale backend."""

    # Invalid storage registry values fail before service-layer persistence.
    with pytest.raises(ValidationError):
        StorageRegistryCreate.model_validate(payload)


def test_storage_registry_response_filters_provider_credentials() -> None:
    """Exclude provider credentials from storage registry responses."""

    # Response serialization exposes endpoint metadata while omitting provider credentials.
    user_id = uuid4()
    payload = StorageRegistryResponse.model_validate(
        {
            "id": uuid4(),
            "kind": "exoscale",
            "name": "Primary Storage",
            "slug": "primary-storage",
            "endpoint_url": "https://sos-ch-gva-2.exo.io",
            "runtime_endpoint_url": "https://sos-ch-gva-2.exo.io",
            "access_key_id": "access-key",
            "secret_access_key": "secret-key",
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
            "created_by": {"id": user_id, "name": "Admin", "email": "admin@example.com", "role": "administrator"},
            "updated_by": {"id": user_id, "name": "Admin", "email": "admin@example.com", "role": "administrator"},
        }
    )

    data = payload.model_dump(mode="json")
    assert data["endpoint_url"] == "https://sos-ch-gva-2.exo.io"
    assert "access_key_id" not in data
    assert "secret_access_key" not in data
