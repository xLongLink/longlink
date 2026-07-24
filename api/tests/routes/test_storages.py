from uuid import uuid4
from factories import create_organization, create_ready_infrastructure
from src.database import session
from src.environments import env
from src.models.roles import PlatformRoles
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
    created = create_response.json()
    registry_id = created["id"]
    delete_response = client.delete(f"/api/storages/{registry_id}")
    get_response = client.get(f"/api/storages/{registry_id}")

    # Assert
    assert create_response.status_code == 201
    assert created["name"] == "Ephemeral Storage"
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


async def test_storage_registry_routes_enforce_support_and_admin_roles(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Allow support storage reads while keeping storage writes admin-only."""

    # Arrange
    owner = users[0]
    support = users[2]
    infrastructure = await create_ready_infrastructure(owner)
    registry = infrastructure.storage
    Session = await session.get_session()
    async with Session() as db_session:
        persisted_support = await db_session.get(User, support.id)
        assert persisted_support is not None
        persisted_support.role = PlatformRoles.support
        await db_session.commit()

    support_client = clients[2]
    ordinary_client = clients[1]

    # Act
    support_read_response = support_client.get("/api/storages")
    support_write_response = support_client.post(
        "/api/storages",
        json={
            "kind": "exoscale",
            "name": "Support Storage",
            "endpoint_url": "https://sos-ch-gva-2.exo.io",
            "runtime_endpoint_url": "https://sos-ch-gva-2.exo.io",
        },
    )
    ordinary_read_response = ordinary_client.get("/api/storages")

    # Assert
    assert support_read_response.status_code == 200
    assert [item["id"] for item in support_read_response.json()] == [str(registry.id)]
    assert support_write_response.status_code == 403
    assert support_write_response.json() == {"detail": "Permission required"}
    assert ordinary_read_response.status_code == 403
    assert ordinary_read_response.json() == {"detail": "Permission required"}
