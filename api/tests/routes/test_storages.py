from httpx2 import AsyncClient


async def test_storage_registry_lifecycle_does_not_expose_credentials(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Keep storage credentials out of every registry response."""

    # Arrange
    payload = {
        "name": "Geneva storage",
        "endpoint_url": "https://sos-ch-gva-2.exo.io",
        "access_key_id": "storage-access-key",
        "secret_access_key": "storage-secret-key",
    }

    # Act
    create_response = await clients[0].post("/api/v1/storages", json=payload)
    registry_id = create_response.json()["id"]
    get_response = await clients[0].get(f"/api/v1/storages/{registry_id}")
    list_response = await clients[0].get("/api/v1/storages")
    delete_response = await clients[0].delete(f"/api/v1/storages/{registry_id}")
    missing_response = await clients[0].get(f"/api/v1/storages/{registry_id}")

    # Assert
    expected_registry = {
        "id": registry_id,
        "name": "Geneva storage",
        "endpoint_url": "https://sos-ch-gva-2.exo.io",
    }
    assert create_response.status_code == 201
    assert create_response.json() == expected_registry
    assert get_response.status_code == 200
    assert get_response.json() == expected_registry
    assert list_response.status_code == 200
    assert list_response.json() == {"items": [expected_registry], "total": 1}
    assert delete_response.status_code == 204
    assert missing_response.status_code == 404
    assert missing_response.json() == {"detail": "Storage registry not found"}
