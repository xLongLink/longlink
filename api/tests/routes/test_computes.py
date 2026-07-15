from factories import create_ready_location
from fastapi.testclient import TestClient
from src.database.services import compute


async def test_compute_registry_endpoints_return_location_backend(
    clients: tuple[TestClient, TestClient, TestClient],
    users,
) -> None:
    """Return the compute backend created with a complete location aggregate."""

    # Arrange
    client = clients[0]
    user1, _, _ = users
    location = await create_ready_location(user1)
    registry = await compute.location(location.id)
    assert registry is not None

    # Act
    list_response = client.get("/api/computes")
    get_response = client.get(f"/api/computes/{registry.id}")

    # Assert
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()] == [str(registry.id)]
    assert get_response.status_code == 200
    payload = get_response.json()
    assert payload["id"] == str(registry.id)
    assert payload["name"] == registry.name
    assert payload["gateway_url"] == "https://gateway.example"
    assert payload["location_id"] == str(location.id)
    assert "kubeconfig" not in payload
    assert "proxy_secret" not in payload
