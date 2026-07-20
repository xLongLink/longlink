from factories import create_ready_infrastructure
from fastapi.testclient import TestClient
from src.database.services import storage


async def test_storage_registry_endpoints_return_backend(
    clients: tuple[TestClient, TestClient, TestClient],
    users,
) -> None:
    """Return an independently registered storage backend."""

    # Arrange
    client = clients[0]
    user1, _, _ = users
    infrastructure = await create_ready_infrastructure(user1)
    registry = infrastructure.storage

    # Act
    list_response = client.get("/api/storages")
    get_response = client.get(f"/api/storages/{registry.id}")

    # Assert
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()] == [str(registry.id)]
    assert get_response.status_code == 200
    payload = get_response.json()
    assert payload["id"] == str(registry.id)
    assert payload["name"] == registry.name
    assert payload["endpoint_url"] == "http://storage.example"
    assert payload["runtime_endpoint_url"] == "http://storage.internal"
    assert "secret_access_key" not in payload
