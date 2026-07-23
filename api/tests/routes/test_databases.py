from factories import create_organization, create_ready_infrastructure
from src.database import session
from src.models.roles import PlatformRoles
from fastapi.testclient import TestClient
from src.database.models.users import User


async def test_database_registry_endpoints_return_backend(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
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
    assert payload["sslmode"] == "disable"
    assert "password" not in payload


async def test_database_registry_create_duplicate_and_delete(
    clients: tuple[TestClient, TestClient, TestClient],
) -> None:
    """Create one database registry, reject a duplicate, and tombstone the unused registry."""

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
    create_response = client.post("/api/databases", json=payload)
    duplicate_response = client.post("/api/databases", json=payload)
    created = create_response.json()
    registry_id = created["id"]
    delete_response = client.delete(f"/api/databases/{registry_id}")
    get_response = client.get(f"/api/databases/{registry_id}")

    # Assert
    assert create_response.status_code == 201
    assert created["name"] == "Ephemeral Database"
    assert "password" not in created
    assert duplicate_response.status_code == 409
    assert duplicate_response.json() == {"detail": "Database registry already exists"}
    assert delete_response.status_code == 200
    assert get_response.status_code == 404


async def test_database_registry_delete_rejects_assigned_registry(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Keep database registries while any Organization still references them."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure(owner)
    await create_organization(infrastructure, owner)
    client = clients[0]

    # Act
    response = client.delete(f"/api/databases/{infrastructure.database.id}")

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Database registry is used by organizations"}


async def test_database_registry_routes_enforce_support_and_admin_roles(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users: tuple[User, User, User],
) -> None:
    """Allow support database reads and diagnostics while keeping writes admin-only."""

    # Arrange
    owner = users[0]
    support = users[2]
    infrastructure = await create_ready_infrastructure(owner)
    registry = infrastructure.database
    Session = await session.get_session()
    async with Session() as db_session:
        persisted_support = await db_session.get(User, support.id)
        assert persisted_support is not None
        persisted_support.role = PlatformRoles.support
        await db_session.commit()

    class FakePostgres:
        """Return deterministic database usage for support diagnostics."""

        def __init__(self, host: str, port: int, username: str, password: str, sslmode: str) -> None:
            """Validate the inspected registry connection fields."""

            assert (host, port, username, password, sslmode) == (
                registry.host,
                registry.port,
                registry.username,
                registry.password,
                registry.sslmode,
            )

        async def usage(self) -> dict[str, int]:
            """Return fake backend capacity counters."""

            return {"space_used": 123}

    monkeypatch.setattr("src.routes.databases.adapters.Postgres", FakePostgres)
    support_client = clients[2]
    ordinary_client = clients[1]

    # Act
    support_read_response = support_client.get("/api/databases")
    support_usage_response = support_client.get(f"/api/databases/{registry.id}/usage")
    support_write_response = support_client.post(
        "/api/databases",
        json={
            "name": "Support Database",
            "host": "database.example",
            "port": 5432,
            "username": "admin",
            "password": "secret",
            "sslmode": "disable",
        },
    )
    ordinary_read_response = ordinary_client.get("/api/databases")

    # Assert
    assert support_read_response.status_code == 200
    assert [item["id"] for item in support_read_response.json()] == [str(registry.id)]
    assert support_usage_response.status_code == 200
    assert support_usage_response.json() == 123
    assert support_write_response.status_code == 403
    assert support_write_response.json() == {"detail": "Permission required"}
    assert ordinary_read_response.status_code == 403
    assert ordinary_read_response.json() == {"detail": "Permission required"}


async def test_database_usage_endpoint_returns_backend_capacity(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users: tuple[User, User, User],
) -> None:
    """Return backend storage usage for one database registry."""

    # Arrange
    client = clients[0]
    user1, _, _ = users
    infrastructure = await create_ready_infrastructure(user1)
    registry = infrastructure.database

    class FakePostgres:
        """Return deterministic database usage without contacting PostgreSQL."""

        def __init__(self, host: str, port: int, username: str, password: str, sslmode: str) -> None:
            """Validate the database registry connection fields."""

            assert (host, port, username, password) == (registry.host, registry.port, registry.username, registry.password)
            assert sslmode == registry.sslmode

        async def usage(self) -> dict[str, int]:
            """Return fake backend capacity counters."""

            return {"space_used": 987654321}

    monkeypatch.setattr("src.routes.databases.adapters.Postgres", FakePostgres)

    # Act
    response = client.get(f"/api/databases/{registry.id}/usage")

    # Assert
    assert response.status_code == 200
    assert response.json() == 987654321


async def test_database_usage_endpoint_returns_unavailable_when_backend_fails(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users: tuple[User, User, User],
) -> None:
    """Return a stable error when database usage cannot be inspected."""

    # Arrange
    client = clients[0]
    owner = users[0]
    infrastructure = await create_ready_infrastructure(owner)
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
    response = client.get(f"/api/databases/{registry.id}/usage")

    # Assert
    assert response.status_code == 503
    assert response.json() == {"detail": "Database usage unavailable"}
