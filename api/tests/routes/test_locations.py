from uuid import UUID
from types import SimpleNamespace
from src.environments import env
from fastapi.testclient import TestClient
from src.database.services import compute, storage, database
from src.models.operations import OperationStatus

db = SimpleNamespace(compute=compute, database=database, storage=storage)

LOCATION_PAYLOAD = {
    "name": "Local testing",
    "country": "DE",
    "compute": {"kubeconfig": "apiVersion: v1\nclusters: []\n"},
    "database": {
        "kind": "postgresql",
        "host": "database.example",
        "port": 5432,
        "username": "admin",
        "password": "secret",
    },
    "storage": {
        "kind": "minio",
        "endpoint_url": "https://storage.example",
        "runtime_endpoint_url": "http://storage.internal",
        "access_key_id": "access-key",
        "secret_access_key": "secret-key",
    },
}


async def test_create_location_accepts_complete_infrastructure(
    clients: tuple[TestClient, TestClient, TestClient],
) -> None:
    """Persist a complete location aggregate and queue reconciliation."""

    # Arrange
    client = clients[0]

    # Act
    response = client.post("/api/locations", json=LOCATION_PAYLOAD)

    # Assert
    assert response.status_code == 202
    payload = response.json()
    location = payload["location"]
    operation = payload["operation"]
    location_id = UUID(location["id"])
    assert location["name"] == "Local testing"
    assert location["slug"] == "local-testing"
    assert location["country"] == "DE"
    assert "provider" not in location
    assert location["status"] == "provisioning"
    assert location["version"] is None
    assert operation["location_id"] == location["id"]
    assert operation["platform_version"] == env.VERSION
    assert operation["status"] == OperationStatus.scheduled
    assert set(operation).isdisjoint(
        {"kind", "revision", "retry_count", "deadline_at", "lease_token", "created_id", "updated_id", "updated_at"}
    )

    # The API accepts infrastructure as one aggregate without exposing credentials in the response.
    assert "compute" not in location
    assert "database" not in location
    assert "storage" not in location
    compute_registry = await db.compute.location(location_id)
    database_registry = await db.database.location(location_id)
    storage_registry = await db.storage.location(location_id)
    assert compute_registry is not None
    assert compute_registry.kubeconfig == LOCATION_PAYLOAD["compute"]["kubeconfig"]
    assert database_registry is not None
    assert database_registry.host == LOCATION_PAYLOAD["database"]["host"]
    assert storage_registry is not None
    assert storage_registry.runtime_endpoint_url == LOCATION_PAYLOAD["storage"]["runtime_endpoint_url"]


async def test_get_locations_returns_pure_location_payload(
    clients: tuple[TestClient, TestClient, TestClient],
) -> None:
    """Return locations without nested infrastructure credentials."""

    # Arrange
    client = clients[0]
    create_response = client.post("/api/locations", json=LOCATION_PAYLOAD)

    # Act
    response = client.get("/api/locations")

    # Assert
    assert create_response.status_code == 202
    assert response.status_code == 200
    assert response.json()[0]["name"] == "Local testing"
    assert response.json()[0]["slug"] == "local-testing"
    assert response.json()[0]["country"] == "DE"
    assert "provider" not in response.json()[0]
    assert response.json()[0]["version"] is None
    assert "compute" not in response.json()[0]
    assert "database" not in response.json()[0]
    assert "storage" not in response.json()[0]


async def test_delete_location_hides_location_and_returns_queued_operation(
    clients: tuple[TestClient, TestClient, TestClient],
) -> None:
    """Soft-delete a location and return its coalesced reconciliation operation."""

    # Arrange
    client = clients[0]
    create_response = client.post("/api/locations", json=LOCATION_PAYLOAD)
    created = create_response.json()
    location_id = created["location"]["id"]

    # Act
    delete_response = client.delete(f"/api/locations/{location_id}")
    get_response = client.get(f"/api/locations/{location_id}")
    list_response = client.get("/api/locations")

    # Assert
    assert create_response.status_code == 202
    assert delete_response.status_code == 202
    deleted = delete_response.json()
    assert deleted["location"]["id"] == location_id
    assert deleted["location"]["status"] == "deleting"
    assert deleted["location"]["version"] is None
    assert deleted["operation"]["id"] == created["operation"]["id"]
    assert deleted["operation"]["location_id"] == location_id
    assert deleted["operation"]["platform_version"] == env.VERSION
    assert deleted["operation"]["status"] == OperationStatus.scheduled
    assert set(deleted["operation"]).isdisjoint(
        {"kind", "revision", "retry_count", "deadline_at", "lease_token", "created_id", "updated_id", "updated_at"}
    )
    assert get_response.status_code == 404
    assert list_response.status_code == 200
    assert list_response.json() == []
