from httpx2 import AsyncClient
from factories import create_ready_infrastructure


async def test_database_registry_endpoints_return_backend(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Return an independently registered database backend."""

    # Arrange
    client = clients[0]
    infrastructure = await create_ready_infrastructure()
    registry = infrastructure.database

    # Act
    list_response = await client.get("/api/v1/databases")
    get_response = await client.get(f"/api/v1/databases/{registry.id}")

    # Assert
    assert list_response.status_code == 200
    assert str(registry.id) in {item["id"] for item in list_response.json()}
    assert get_response.status_code == 200
    payload = get_response.json()
    assert payload["id"] == str(registry.id)
    assert payload["name"] == registry.name
    assert payload["host"] == "database.example"
    assert payload["sslmode"] == "disable"
    assert "password" not in payload


async def test_database_usage_endpoint_returns_unavailable_when_backend_fails(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    monkeypatch,
) -> None:
    """Return a stable error when database usage cannot be inspected."""

    # Arrange
    client = clients[0]
    infrastructure = await create_ready_infrastructure()

    class FakePostgres:
        """Raise a backend usage error."""

        def __init__(self, host: str, port: int, username: str, password: str, sslmode: str) -> None:
            """Accept database registry connection fields."""

        async def usage(self) -> dict[str, int]:
            """Raise the backend error expected by the test."""

            raise RuntimeError("database offline")

    monkeypatch.setattr("src.routes.v1.databases.Postgres", FakePostgres)

    # Act
    response = await client.get(f"/api/v1/databases/{infrastructure.database.id}/usage")

    # Assert
    assert response.status_code == 503
    assert response.json() == {"detail": "Database usage unavailable"}
