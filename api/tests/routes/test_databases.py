from factories import create_ready_infrastructure
from fastapi.testclient import TestClient
from src.database.services import database


async def test_database_registry_endpoints_return_backend(
    clients: tuple[TestClient, TestClient, TestClient],
    users,
) -> None:
    """Return an independently registered database backend."""

    # Arrange
    client = clients[0]
    user1, _, _ = users
    infrastructure = await create_ready_infrastructure(user1)
    registry = infrastructure.database

    # Act
    list_response = client.get("/api/databases")
    get_response = client.get(f"/api/databases/{registry.id}")

    # Assert
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()] == [str(registry.id)]
    assert get_response.status_code == 200
    payload = get_response.json()
    assert payload["id"] == str(registry.id)
    assert payload["name"] == registry.name
    assert payload["host"] == "database.example"
    assert "password" not in payload


async def test_database_usage_endpoint_returns_backend_capacity(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users,
) -> None:
    """Return backend storage usage for one database registry."""

    # Arrange
    client = clients[0]
    user1, _, _ = users
    infrastructure = await create_ready_infrastructure(user1)
    registry = infrastructure.database

    class FakePostgres:
        """Return deterministic database usage without contacting PostgreSQL."""

        def __init__(self, host: str, port: int, username: str, password: str) -> None:
            """Validate the database registry connection fields."""

            assert (host, port, username, password) == (registry.host, registry.port, registry.username, registry.password)

        async def usage(self) -> dict[str, int]:
            """Return fake backend capacity counters."""

            return {"space_used": 987654321}

    monkeypatch.setattr("src.routes.databases.adapters.Postgres", FakePostgres)

    # Act
    response = client.get(f"/api/databases/{registry.id}/usage")

    # Assert
    assert response.status_code == 200
    assert response.json() == 987654321
