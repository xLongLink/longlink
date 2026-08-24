import pytest
from uuid import uuid4
from httpx2 import AsyncClient
from factories import create_organization, create_ready_infrastructure


@pytest.mark.parametrize(
    ("usage", "expected_status", "expected_payload"),
    [
        pytest.param(42, 200, 42, id="available"),
        pytest.param(RuntimeError("database offline"), 503, {"detail": "Database usage unavailable"}, id="backend-unavailable"),
    ],
)
async def test_database_usage_endpoint_returns_usage_or_unavailable(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    monkeypatch,
    usage: int | Exception,
    expected_status: int,
    expected_payload: int | dict[str, str],
) -> None:
    """Return backend usage or a stable error when inspection fails."""

    # Arrange
    client = clients[0]
    infrastructure = await create_ready_infrastructure()

    class FakePostgres:
        """Provide database usage responses for the endpoint."""

        def __init__(self, *_args: object) -> None:
            """Accept database registry connection fields."""

        async def usage(self) -> int:
            """Return usage or raise the configured backend failure."""

            if isinstance(usage, Exception):
                raise usage
            return usage

    monkeypatch.setattr("src.routes.v1.databases.Postgres", FakePostgres)

    # Act
    response = await client.get(f"/api/v1/databases/{infrastructure.database.id}/usage")

    # Assert
    assert response.status_code == expected_status
    assert response.json() == expected_payload


async def test_database_usage_endpoint_rejects_missing_registry(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Reject an absent database registry."""

    # Arrange
    registry_id = uuid4()

    # Act
    response = await clients[0].get(f"/api/v1/databases/{registry_id}/usage")

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Database registry not found"}


async def test_database_usage_endpoint_rejects_regular_users_before_connecting(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Require administrator access before opening a database adapter."""

    # Arrange
    infrastructure = await create_ready_infrastructure()

    def unexpected_postgres(*_args: object) -> object:
        """Fail if authorization reaches the database boundary."""

        raise AssertionError("Postgres adapter was constructed")

    monkeypatch.setattr("src.routes.v1.databases.Postgres", unexpected_postgres)

    # Act
    response = await clients[1].get(f"/api/v1/databases/{infrastructure.database.id}/usage")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}


async def test_database_registry_creation_uses_required_ssl_by_default(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Use the secure SSL mode when the registry payload omits it."""

    # Arrange
    payload = {
        "name": "Default TLS database",
        "host": "database.example",
        "port": 5432,
        "username": "admin",
        "password": "database-secret",
    }
    # Act
    response = await clients[0].post("/api/v1/databases", json=payload)

    # Assert
    assert response.status_code == 201
    assert response.json()["sslmode"] == "require"


async def test_database_registry_list_and_detail_exclude_password(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Return database connection metadata without its administrator password."""

    # Arrange
    infrastructure = await create_ready_infrastructure()

    # Act
    list_response = await clients[0].get("/api/v1/databases")
    detail_response = await clients[0].get(f"/api/v1/databases/{infrastructure.database.id}")

    # Assert
    expected = {
        "id": str(infrastructure.database.id),
        "name": infrastructure.database.name,
        "host": "database.example",
        "port": 5432,
        "sslmode": "disable",
        "username": "admin",
    }
    assert list_response.status_code == 200
    assert list_response.json() == {"items": [expected], "total": 1}
    assert detail_response.status_code == 200
    assert detail_response.json() == expected


async def test_database_registry_deletion_rejects_organization_assignment(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users,
) -> None:
    """Keep an Organization's assigned database registry available."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    await create_organization(users[1], infrastructure=infrastructure)

    # Act
    response = await clients[0].delete(f"/api/v1/databases/{infrastructure.database.id}")

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Database registry is used by organizations"}


async def test_database_registry_deletion_removes_unused_registry(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Delete an unassigned database registry."""

    # Arrange
    infrastructure = await create_ready_infrastructure()

    # Act
    delete_response = await clients[0].delete(f"/api/v1/databases/{infrastructure.database.id}")
    detail_response = await clients[0].get(f"/api/v1/databases/{infrastructure.database.id}")

    # Assert
    assert delete_response.status_code == 204
    assert detail_response.status_code == 404
    assert detail_response.json() == {"detail": "Database registry not found"}
