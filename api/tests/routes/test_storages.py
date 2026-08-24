from httpx2 import AsyncClient
from factories import create_organization, create_ready_infrastructure


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


async def test_storage_registry_list_and_detail_omit_credentials(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Return paginated storage metadata without provider credentials."""

    # Arrange
    infrastructure = await create_ready_infrastructure()

    # Act
    list_response = await clients[0].get("/api/v1/storages")
    detail_response = await clients[0].get(f"/api/v1/storages/{infrastructure.storage.id}")

    # Assert
    expected_registry = {
        "id": str(infrastructure.storage.id),
        "name": infrastructure.storage.name,
        "endpoint_url": "https://sos-ch-gva-2.exo.io",
    }
    assert list_response.status_code == 200
    assert list_response.json() == {"items": [expected_registry], "total": 1}
    assert detail_response.status_code == 200
    assert detail_response.json() == expected_registry



async def test_storage_registry_deletion_rejects_organization_assignment(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users,
) -> None:
    """Keep an Organization's assigned storage registry available."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    await create_organization(users[1], infrastructure=infrastructure)

    # Act
    response = await clients[0].delete(f"/api/v1/storages/{infrastructure.storage.id}")

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Storage registry is used by organizations"}


async def test_storage_registry_deletion_removes_unused_registry(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Delete an unassigned storage registry."""

    # Arrange
    infrastructure = await create_ready_infrastructure()

    # Act
    delete_response = await clients[0].delete(f"/api/v1/storages/{infrastructure.storage.id}")
    detail_response = await clients[0].get(f"/api/v1/storages/{infrastructure.storage.id}")

    # Assert
    assert delete_response.status_code == 204
    assert detail_response.status_code == 404
    assert detail_response.json() == {"detail": "Storage registry not found"}
