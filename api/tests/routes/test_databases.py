import pytest
from uuid import uuid4
from httpx2 import AsyncClient
from factories import create_ready_infrastructure


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


async def test_database_registry_list_paginates_without_exposing_password(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Return one ordered registry page without its administrator password."""

    # Arrange
    alpha_payload = {
        "name": "Alpha database",
        "host": "alpha.example",
        "port": 5432,
        "username": "administrator",
        "password": "alpha-password",
        "sslmode": "require",
    }
    bravo_payload = {
        "name": "Bravo database",
        "host": "bravo.example",
        "port": 5432,
        "username": "administrator",
        "password": "bravo-password",
        "sslmode": "require",
    }
    alpha_response = await clients[0].post("/api/v1/databases", json=alpha_payload)
    bravo_response = await clients[0].post("/api/v1/databases", json=bravo_payload)

    # Act
    response = await clients[0].get("/api/v1/databases?page_size=1")

    # Assert
    assert alpha_response.status_code == 201
    assert bravo_response.status_code == 201
    assert response.status_code == 200
    assert response.json() == {
        "items": [
            {
                "id": alpha_response.json()["id"],
                "name": "Alpha database",
                "host": "alpha.example",
                "port": 5432,
                "sslmode": "require",
                "username": "administrator",
            }
        ],
        "total": 2,
    }
