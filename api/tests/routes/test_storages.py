from httpx2 import AsyncClient
from factories import create_ready_infrastructure


async def test_storage_registry_endpoints_return_backend(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Return an independently registered storage backend."""

    # Arrange
    client = clients[0]
    infrastructure = await create_ready_infrastructure()
    registry = infrastructure.storage

    # Act
    list_response = await client.get("/api/v1/storages")
    get_response = await client.get(f"/api/v1/storages/{registry.id}")

    # Assert
    assert list_response.status_code == 200
    assert str(registry.id) in {item["id"] for item in list_response.json()}
    assert get_response.status_code == 200
    payload = get_response.json()
    assert payload["id"] == str(registry.id)
    assert payload["name"] == registry.name
    assert payload["endpoint_url"] == "https://sos-ch-gva-2.exo.io"
    assert "access_key_id" not in payload
    assert "secret_access_key" not in payload
    for response in (list_response, get_response):
        assert registry.access_key_id not in response.text
        assert registry.secret_access_key not in response.text
