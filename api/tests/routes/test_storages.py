from uuid import uuid4
from factories import create_organization
from factories import create_ready_infrastructure
from src.environments import env
from fastapi.testclient import TestClient
from src.database.models.users import User


async def test_storage_registry_endpoints_return_backend(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
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
    assert payload["endpoint_url"] == "https://sos-ch-gva-2.exo.io"
    assert payload["runtime_endpoint_url"] == "https://sos-ch-gva-2.exo.io"
    assert "access_key_id" not in payload


async def test_storage_registry_create_duplicate_and_delete(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
) -> None:
    """Create one storage registry, reject a duplicate, and tombstone the unused registry."""

    # Arrange
    monkeypatch.setattr(env, "EXOSCALE_API_KEY", "key")
    monkeypatch.setattr(env, "EXOSCALE_API_SECRET", "secret")
    monkeypatch.setattr(env, "EXOSCALE_ORGANIZATION_ID", uuid4())
    client = clients[0]
    payload = {
        "kind": "exoscale",
        "name": "Ephemeral Storage",
        "endpoint_url": "https://sos-ch-gva-2.exo.io",
        "runtime_endpoint_url": "https://sos-ch-gva-2.exo.io",
    }

    # Act
    create_response = client.post("/api/storages", json=payload)
    duplicate_response = client.post("/api/storages", json=payload)
    registry_id = create_response.json()["id"]
    delete_response = client.delete(f"/api/storages/{registry_id}")
    get_response = client.get(f"/api/storages/{registry_id}")

    # Assert
    assert create_response.status_code == 201
    assert create_response.json()["name"] == "Ephemeral Storage"
    assert duplicate_response.status_code == 409
    assert duplicate_response.json() == {"detail": "Storage registry already exists"}
    assert delete_response.status_code == 200
    assert get_response.status_code == 404


async def test_storage_registry_delete_rejects_assigned_registry(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Keep storage registries while any Organization still references them."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure(owner)
    await create_organization(infrastructure, owner)
    client = clients[0]

    # Act
    response = client.delete(f"/api/storages/{infrastructure.storage.id}")

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Storage registry is used by organizations"}
