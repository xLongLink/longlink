from httpx2 import AsyncClient
from factories import create_ready_infrastructure


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
