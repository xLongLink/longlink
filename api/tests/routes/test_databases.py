from types import SimpleNamespace
from fastapi.testclient import TestClient
from src.database.services import users
from src.database.services import database
from src.database.services import locations

db = SimpleNamespace(
    database=database,
    locations=locations,
    users=users,
)


async def test_database_registry_endpoint_supports_create_and_list(
    clients: tuple[TestClient, TestClient, TestClient],
    users,
) -> None:
    """Create, list, and delete one database registry."""

    # Arrange
    client = clients[0]
    user1, _, _ = users
    location = await db.locations.create("local", "Local testing", user1, "CH")

    # Act
    create_response = client.post(
        "/api/databases",
        json={
            "kind": "postgresql",
            "name": "primary",
            "host": "db.longlink.internal",
            "port": 5432,
            "username": "longlink",
            "password": "secret",
            "runtime_host": "db.runtime.longlink.internal",
            "runtime_port": 15432,
            "location_id": str(location.id),
        },
    )
    list_response = client.get("/api/databases")
    registry_id = create_response.json()["id"]
    delete_response = client.delete(f"/api/databases/{registry_id}")
    get_response = client.get(f"/api/databases/{registry_id}")

    # Assert
    assert create_response.status_code == 200
    create_payload = create_response.json()
    assert create_payload["id"] == registry_id
    assert create_payload["name"] == "primary"
    assert create_payload["runtime_host"] == "db.runtime.longlink.internal"
    assert "password" not in create_payload
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()] == [registry_id]
    assert delete_response.status_code == 204
    assert get_response.status_code == 404


async def test_database_usage_endpoint_returns_backend_capacity(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users,
) -> None:
    """Return backend storage usage for one database registry."""

    # Arrange
    client = clients[0]
    user1, _, _ = users
    location = await db.locations.create("local", "Local testing", user1, "CH")
    create_response = client.post(
        "/api/databases",
        json={
            "kind": "postgresql",
            "name": "primary",
            "host": "db.longlink.internal",
            "port": 5432,
            "username": "longlink",
            "password": "secret",
            "location_id": str(location.id),
        },
    )
    registry_id = create_response.json()["id"]

    class FakePostgres:
        def __init__(self, host: str, port: int, username: str, password: str) -> None:
            self.host = host
            self.port = port
            self.username = username
            self.password = password

        async def usage(self) -> dict[str, int]:
            return {"space_used": 987654321}

    monkeypatch.setattr(
        "src.routes.databases.adapters.database",
        lambda registry: FakePostgres(registry.host, registry.port, registry.username, registry.password),
    )

    # Act
    response = client.get(f"/api/databases/{registry_id}/usage")

    # Assert
    assert response.status_code == 200
    assert response.json()["space_used"] == 987654321
