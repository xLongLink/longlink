from factories import create_ready_infrastructure
from fastapi.testclient import TestClient


async def test_compute_registry_endpoints_return_backend(
    clients: tuple[TestClient, TestClient, TestClient],
    users,
) -> None:
    """Return an independently registered compute backend."""

    # Arrange
    client = clients[0]
    user1, _, _ = users
    infrastructure = await create_ready_infrastructure(user1)
    registry = infrastructure.compute

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
    assert payload["status"] == "ready"
    assert payload["version"] is not None
    assert "kubeconfig" not in payload
    assert "proxy_secret" not in payload
