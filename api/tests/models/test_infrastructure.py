import pytest
from pydantic import ValidationError
from src.models.infrastructure import DatabaseConfiguration

pytestmark = pytest.mark.no_db


def test_database_configuration_accepts_plain_hosts() -> None:
    """Accept one plain database host and port pair."""

    # Validate the minimum database registry connection fields.
    payload = DatabaseConfiguration(
        host=" database.example/ ",
        port=5432,
        username="admin",
        password="secret",
    )

    assert payload.host == "database.example"


@pytest.mark.parametrize("host", ["https://database.example", "database.example:5432", "database.example:invalid", "db example"])
def test_database_configuration_rejects_embedded_connection_parts(host: str) -> None:
    """Reject database hosts that include URL, port, or whitespace data."""

    # Host validation keeps the port and credentials in dedicated fields.
    with pytest.raises(ValidationError):
        DatabaseConfiguration(host=host, port=5432, username="admin", password="secret")
