from uuid import uuid4
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

        def __init__(self, *_args: object) -> None:
            """Accept database registry connection fields."""

        async def usage(self) -> int:
            """Raise the backend error expected by the test."""

            raise RuntimeError("database offline")

    monkeypatch.setattr("src.routes.v1.databases.Postgres", FakePostgres)

    # Act
    response = await client.get(f"/api/v1/databases/{infrastructure.database.id}/usage")

    # Assert
    assert response.status_code == 503
    assert response.json() == {"detail": "Database usage unavailable"}


async def test_database_usage_endpoint_returns_backend_usage(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    monkeypatch,
) -> None:
    """Return diagnostic usage from the registered database backend."""

    # Arrange
    infrastructure = await create_ready_infrastructure()

    class FakePostgres:
        """Return a fixed backend usage value."""

        def __init__(self, *_args: object) -> None:
            """Accept database registry connection fields."""

        async def usage(self) -> int:
            """Return the configured database usage."""

            return 42

    monkeypatch.setattr("src.routes.v1.databases.Postgres", FakePostgres)

    # Act
    response = await clients[0].get(f"/api/v1/databases/{infrastructure.database.id}/usage")

    # Assert
    assert response.status_code == 200
    assert response.json() == 42


async def test_database_usage_endpoint_rejects_missing_registry_before_connecting(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    monkeypatch,
) -> None:
    """Reject an absent registry without constructing a backend adapter."""

    # Arrange
    def unexpected_postgres(*_args: object) -> object:
        """Fail if the missing registry path reaches the backend."""

        raise AssertionError("Postgres adapter was constructed")

    monkeypatch.setattr("src.routes.v1.databases.Postgres", unexpected_postgres)

    # Act
    response = await clients[0].get(f"/api/v1/databases/{uuid4()}/usage")

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Database registry not found"}
