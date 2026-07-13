from types import SimpleNamespace
from fastapi.testclient import TestClient
from src.database.services import users, storage, locations

db = SimpleNamespace(
    locations=locations,
    storage=storage,
    users=users,
)


async def test_storage_registry_endpoint_supports_create_and_list(
    clients: tuple[TestClient, TestClient, TestClient],
    users,
) -> None:
    """Create, list, and delete one storage registry."""

    # Arrange
    client = clients[0]
    user1, _, _ = users
    location = await db.locations.create("local", "Local testing", user1, "CH")

    # Act
    create_response = client.post(
        "/api/storages",
        json={
            "kind": "minio",
            "name": "object-store",
            "endpoint_url": "https://storage.longlink.internal",
            "runtime_endpoint_url": "https://storage.runtime.longlink.internal",
            "access_key_id": "access-key",
            "secret_access_key": "secret-key",
            "location_id": str(location.id),
        },
    )
    list_response = client.get("/api/storages")
    registry_id = create_response.json()["id"]
    delete_response = client.delete(f"/api/storages/{registry_id}")
    get_response = client.get(f"/api/storages/{registry_id}")

    # Assert
    assert create_response.status_code == 200
    create_payload = create_response.json()
    assert create_payload["id"] == registry_id
    assert create_payload["name"] == "object-store"
    assert create_payload["runtime_endpoint_url"] == "https://storage.runtime.longlink.internal"
    assert "secret_access_key" not in create_payload
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()] == [registry_id]
    assert delete_response.status_code == 204
    assert get_response.status_code == 404


async def test_storage_bucket_endpoint_returns_backend_buckets(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users,
) -> None:
    """Return buckets for one storage registry."""

    # Arrange
    client = clients[0]
    user1, _, _ = users
    location = await db.locations.create("local", "Local testing", user1, "CH")
    create_response = client.post(
        "/api/storages",
        json={
            "kind": "minio",
            "name": "object-store",
            "endpoint_url": "https://storage.longlink.internal",
            "access_key_id": "access-key",
            "secret_access_key": "secret-key",
            "location_id": str(location.id),
        },
    )
    registry_id = create_response.json()["id"]

    async def fake_buckets(registry) -> list[str]:
        """Return fake bucket names from the storage backend."""

        assert str(registry.id) == registry_id
        return ["alpha", "acme-shared", "acme-dashboard"]

    monkeypatch.setattr("src.routes.storages.storage_utils.buckets", fake_buckets)

    # Act
    response = client.get(f"/api/storages/{registry_id}/buckets")

    # Assert
    assert response.status_code == 200
    assert response.json() == ["alpha", "acme-shared", "acme-dashboard"]


async def test_storage_object_endpoint_returns_bucket_objects(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users,
) -> None:
    """Return object metadata for one storage bucket."""

    # Arrange
    client = clients[0]
    user1, _, _ = users
    location = await db.locations.create("local", "Local testing", user1, "CH")
    create_response = client.post(
        "/api/storages",
        json={
            "kind": "minio",
            "name": "object-store",
            "endpoint_url": "https://storage.longlink.internal",
            "access_key_id": "access-key",
            "secret_access_key": "secret-key",
            "location_id": str(location.id),
        },
    )
    registry_id = create_response.json()["id"]

    async def fake_objects(registry, bucket_name: str, *, limit: int = 1000) -> list[dict[str, object]]:
        """Return fake object metadata for one bucket."""

        assert str(registry.id) == registry_id
        assert bucket_name == "alpha"
        assert limit == 1000
        return [
            {
                "key": "reports/july.csv",
                "size": 123,
                "etag": '"abc123"',
            }
        ]

    monkeypatch.setattr("src.routes.storages.storage_utils.objects", fake_objects)

    # Act
    response = client.get(f"/api/storages/{registry_id}/buckets/alpha/objects")

    # Assert
    assert response.status_code == 200
    payload = response.json()
    assert payload[0]["key"] == "reports/july.csv"
    assert payload[0]["size"] == 123
