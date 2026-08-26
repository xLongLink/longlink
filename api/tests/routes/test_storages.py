from httpx2 import AsyncClient


async def test_storage_registry_creation_normalizes_endpoint_url(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Persist and return the canonical Exoscale endpoint URL."""

    # Arrange
    payload = {
        "name": "Normalized storage",
        "endpoint_url": " https://sos-ch-gva-2.exo.io/ ",
        "access_key_id": "storage-access-key",
        "secret_access_key": "storage-secret-key",
    }

    # Act
    response = await clients[0].post("/api/v1/storages", json=payload)

    # Assert
    assert response.status_code == 201
    payload = response.json()
    assert payload["name"] == "Normalized storage"
    assert payload["endpoint_url"] == "https://sos-ch-gva-2.exo.io"
