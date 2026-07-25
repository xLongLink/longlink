from uuid import uuid4
from datetime import UTC, datetime
import pytest
from pydantic import ValidationError
from src.models.types import DatabaseSSLMode
from src.models.databases import DatabaseRegistryCreate, DatabaseRegistryResponse

pytestmark = pytest.mark.no_db


def test_database_registry_create_accepts_plain_connection_payload() -> None:
    """Accept the database registry payload submitted by the Platform UI."""

    # Validate and normalize database registry connection fields at the model boundary.
    payload = DatabaseRegistryCreate.model_validate(
        {
            "name": "Primary Database",
            "host": " database.example/ ",
            "port": 5432,
            "username": "admin",
            "password": "secret",
            "sslmode": "disable",
        }
    )

    assert payload.name == "Primary Database"
    assert payload.host == "database.example"
    assert payload.sslmode == DatabaseSSLMode.disable


@pytest.mark.parametrize(
    "payload",
    [
        {"name": "", "host": "database.example", "port": 5432, "username": "admin", "password": "secret"},
        {"name": "Primary Database", "host": "https://database.example", "port": 5432, "username": "admin", "password": "secret"},
        {"name": "Primary Database", "host": "database.example", "port": 0, "username": "admin", "password": "secret"},
    ],
)
def test_database_registry_create_rejects_invalid_connection_payload(payload: dict[str, object]) -> None:
    """Reject database registry payloads that cannot identify a safe backend."""

    # Invalid database registry values fail before service-layer persistence.
    with pytest.raises(ValidationError):
        DatabaseRegistryCreate.model_validate(payload)


def test_database_registry_response_filters_password() -> None:
    """Exclude administrator passwords from database registry responses."""

    # Response serialization exposes diagnostics while omitting backend credentials.
    user_id = uuid4()
    payload = DatabaseRegistryResponse.model_validate(
        {
            "id": uuid4(),
            "name": "Primary Database",
            "slug": "primary-database",
            "host": "database.example",
            "port": 5432,
            "sslmode": "disable",
            "username": "admin",
            "password": "secret",
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
            "created_by": {"id": user_id, "name": "Admin", "email": "admin@example.com", "role": "administrator"},
            "updated_by": {"id": user_id, "name": "Admin", "email": "admin@example.com", "role": "administrator"},
        }
    )

    data = payload.model_dump(mode="json")
    assert data["username"] == "admin"
    assert "password" not in data
