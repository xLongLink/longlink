import pytest
from pydantic import ValidationError
from src.models.storages import StorageRegistryCreate

pytestmark = pytest.mark.no_db


def test_storage_registry_create_accepts_exoscale_endpoint_payload() -> None:
    """Accept the Exoscale storage registry payload submitted by the Platform UI."""

    # Validate and normalize storage endpoint URLs at the model boundary.
    payload = StorageRegistryCreate.model_validate(
        {
            "name": "Primary Storage",
            "endpoint_url": "https://sos-ch-gva-2.exo.io/",
            "access_key_id": "access-key",
            "secret_access_key": "secret-key",
        }
    )

    assert payload.name == "Primary Storage"
    assert payload.endpoint_url == "https://sos-ch-gva-2.exo.io"


@pytest.mark.parametrize(
    "payload",
    [
        {
            "name": "",
            "endpoint_url": "https://sos-ch-gva-2.exo.io",
            "access_key_id": "access-key",
            "secret_access_key": "secret-key",
        },
        {
            "name": "Primary Storage",
            "endpoint_url": "http://sos-ch-gva-2.exo.io",
            "access_key_id": "access-key",
            "secret_access_key": "secret-key",
        },
    ],
)
def test_storage_registry_create_rejects_invalid_endpoint_payload(payload: dict[str, object]) -> None:
    """Reject storage registry payloads that cannot identify a supported Exoscale backend."""

    # Invalid storage registry values fail before service-layer persistence.
    with pytest.raises(ValidationError):
        StorageRegistryCreate.model_validate(payload)
