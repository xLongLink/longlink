import pytest
from pydantic import ValidationError
from src.models.types import StorageKind, DatabaseSSLMode
from src.models.infrastructure import StorageConfiguration, DatabaseConfiguration

pytestmark = pytest.mark.no_db


def test_database_configuration_accepts_plain_hosts() -> None:
    """Accept one plain database host and port pair."""

    # Validate the minimum database registry connection fields.
    payload = DatabaseConfiguration(
        host=" database.example/ ",
        port=5432,
        username="admin",
        password="secret",
        sslmode=DatabaseSSLMode.disable,
    )

    assert payload.host == "database.example"
    assert payload.port == 5432
    assert payload.sslmode == DatabaseSSLMode.disable


@pytest.mark.parametrize("host", ["https://database.example", "database.example:5432", "db example"])
def test_database_configuration_rejects_embedded_connection_parts(host: str) -> None:
    """Reject database hosts that include URL, port, or whitespace data."""

    # Host validation keeps the port and credentials in dedicated fields.
    with pytest.raises(ValidationError):
        DatabaseConfiguration(host=host, port=5432, username="admin", password="secret")


def test_storage_configuration_accepts_same_exoscale_zone() -> None:
    """Accept control and runtime storage endpoints in the same Exoscale zone."""

    # Exoscale storage endpoints are normalized before persistence.
    payload = StorageConfiguration(
        kind=StorageKind.exoscale,
        endpoint_url="https://sos-ch-gva-2.exo.io/",
        runtime_endpoint_url="https://sos-ch-gva-2.exo.io",
    )

    assert payload.endpoint_url == "https://sos-ch-gva-2.exo.io"
    assert payload.runtime_endpoint_url == "https://sos-ch-gva-2.exo.io"


def test_storage_configuration_rejects_cross_zone_exoscale_endpoints() -> None:
    """Reject Exoscale runtime endpoints from a different zone."""

    # Control and runtime storage endpoints must describe the same zone.
    with pytest.raises(ValidationError):
        StorageConfiguration(
            kind=StorageKind.exoscale,
            endpoint_url="https://sos-ch-gva-2.exo.io",
            runtime_endpoint_url="https://sos-de-fra-1.exo.io",
        )
