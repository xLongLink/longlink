import pytest
from pydantic import ValidationError
from src.models.databases import DatabaseRegistryCreate

pytestmark = pytest.mark.no_db


def test_database_registry_create_rejects_invalid_connection_payload() -> None:
    """Reject database registry payloads that cannot identify a safe backend."""

    # Invalid database registry values fail before service-layer persistence.
    with pytest.raises(ValidationError):
        DatabaseRegistryCreate.model_validate(
            {"name": "", "host": "database.example", "port": 5432, "username": "admin", "password": "secret"}
        )
