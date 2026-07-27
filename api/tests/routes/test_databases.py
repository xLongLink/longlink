from httpx2 import AsyncClient
from factories import create_organization, create_ready_infrastructure
from src.database.models.users import User


async def test_database_registry_endpoints_return_backend(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Return an independently registered database backend."""

    # Arrange
    client = clients[0]
    infrastructure = await create_ready_infrastructure()
    registry = infrastructure.database

    # Act
    list_response = await client.get("/api/databases")
    get_response = await client.get(f"/api/databases/{registry.id}")

    # Assert
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()] == [str(registry.id)]
    assert get_response.status_code == 200
    payload = get_response.json()
    assert payload["id"] == str(registry.id)
    assert payload["name"] == registry.name
    assert payload["host"] == "database.example"
    assert payload["sslmode"] == "disable"
    assert "password" not in payload
    assert "created_at" not in payload


async def test_database_registry_create_duplicate_and_delete(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Create one database registry, reject a duplicate, and delete the unused registry."""

    # Arrange
    client = clients[0]
    payload = {
        "name": "Ephemeral Database",
        "host": "database.example",
        "port": 5432,
        "username": "admin",
        "password": "secret",
        "sslmode": "disable",
    }

    # Act
    create_response = await client.post("/api/databases", json=payload)
    duplicate_response = await client.post("/api/databases", json=payload)
    created = create_response.json()
    registry_id = created["id"]
    delete_response = await client.delete(f"/api/databases/{registry_id}")
    get_response = await client.get(f"/api/databases/{registry_id}")

    # Assert
    assert create_response.status_code == 201
    assert created["name"] == "Ephemeral Database"
    assert "password" not in created
    assert duplicate_response.status_code == 409
    assert duplicate_response.json() == {"detail": "Database registry already exists"}
    assert delete_response.status_code == 204
    assert delete_response.content == b""
    assert get_response.status_code == 404


async def test_database_registry_delete_rejects_assigned_registry(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Keep database registries while any Organization still references them."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure()
    await create_organization(infrastructure, owner)
    client = clients[0]

    # Act
    response = await client.delete(f"/api/databases/{infrastructure.database.id}")

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Database registry is used by organizations"}


async def test_database_registry_routes_require_admin(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Reject Platform users from database registry administration."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    registry = infrastructure.database
    client = clients[1]

    # Act
    read_response = await client.get("/api/databases")
    usage_response = await client.get(f"/api/databases/{registry.id}/usage")
    write_response = await client.post(
        "/api/databases",
        json={
            "name": "Denied Database",
            "host": "database.example",
            "port": 5432,
            "username": "admin",
            "password": "secret",
            "sslmode": "disable",
        },
    )

    # Assert
    for response in (read_response, usage_response, write_response):
        assert response.status_code == 403
        assert response.json() == {"detail": "Permission required"}


async def test_database_usage_endpoint_returns_unavailable_when_backend_fails(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    monkeypatch,
) -> None:
    """Return a stable error when database usage cannot be inspected."""

    # Arrange
    client = clients[0]
    infrastructure = await create_ready_infrastructure()
    registry = infrastructure.database

    class FakePostgres:
        """Raise a backend usage error."""

        def __init__(self, host: str, port: int, username: str, password: str, sslmode: str) -> None:
            """Validate the registry connection fields."""

            assert (host, port, username, password) == (registry.host, registry.port, registry.username, registry.password)
            assert sslmode == registry.sslmode

        async def usage(self) -> dict[str, int]:
            """Raise the backend error expected by the test."""

            raise RuntimeError("database offline")

    monkeypatch.setattr("src.routes.databases.adapters.Postgres", FakePostgres)

    # Act
    response = await client.get(f"/api/databases/{registry.id}/usage")

    # Assert
    assert response.status_code == 503
    assert response.json() == {"detail": "Database usage unavailable"}
