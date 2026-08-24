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


async def test_storage_registry_list_and_detail_exclude_credentials(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Return storage metadata without provider credentials."""

    # Arrange
    payload = {
        "name": "Credentialed storage",
        "endpoint_url": "https://sos-ch-gva-2.exo.io",
        "access_key_id": "storage-access-key",
        "secret_access_key": "storage-secret-key",
    }
    create_response = await clients[0].post("/api/v1/storages", json=payload)
    registry_id = create_response.json()["id"]

    # Act
    list_response = await clients[0].get("/api/v1/storages")
    detail_response = await clients[0].get(f"/api/v1/storages/{registry_id}")

    # Assert
    expected = {
        "id": registry_id,
        "name": "Credentialed storage",
        "endpoint_url": "https://sos-ch-gva-2.exo.io",
    }
    assert create_response.status_code == 201
    assert list_response.status_code == 200
    assert list_response.json() == {"items": [expected], "total": 1}
    assert detail_response.status_code == 200
    assert detail_response.json() == expected
