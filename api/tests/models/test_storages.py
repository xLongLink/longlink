import pytest
from pydantic import ValidationError
from src.models.storages import StorageRegistryCreate

pytestmark = pytest.mark.no_db


def test_storage_registry_create_accepts_exoscale_endpoint_payload() -> None:
    """Accept the Exoscale storage registry payload submitted by the Platform UI."""

    # Validate and normalize storage endpoint URLs at the model boundary.
    assert StorageRegistryCreate.model_validate(
        {
            "name": "Primary Storage",
            "endpoint_url": "https://sos-ch-gva-2.exo.io/",
            "access_key_id": "access-key",
            "secret_access_key": "secret-key",
        }
    ).endpoint_url == "https://sos-ch-gva-2.exo.io"


@pytest.mark.parametrize(
    "endpoint_url",
    [
        "http://sos-ch-gva-2.exo.io",
        "https://access:secret@sos-ch-gva-2.exo.io",
        "https://sos-ch-gva-2.exo.io:443",
        "https://sos-ch-gva-2.exo.io:invalid",
        "https://sos-ch-gva-2.exo.io/bucket",
        "https://sos-ch-gva-2.exo.io?endpoint=metadata.internal",
        "https://sos-ch-gva-2.exo.io#metadata.internal",
        "https://sos-ch-gva-2.exo.io.attacker.example",
    ],
)
def test_storage_registry_create_rejects_ssrf_and_parser_bypass_endpoints(endpoint_url: str) -> None:
    """Reject storage registry payloads that cannot identify a supported Exoscale backend."""

    # Invalid storage registry values fail before service-layer persistence.
    payload = {
        "name": "Primary Storage",
        "access_key_id": "access-key",
        "secret_access_key": "secret-key",
    }
    with pytest.raises(ValidationError):
        StorageRegistryCreate.model_validate({**payload, "endpoint_url": endpoint_url})
