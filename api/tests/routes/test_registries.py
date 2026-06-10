import src.database as db
from fastapi.testclient import TestClient
from src.models import (ComputeRegistryResponse, StorageRegistryResponse,
                        DatabaseRegistryResponse)
from src.models.kinds import ComputeKind, StorageKind, DatabaseKind


async def test_operations_endpoint_returns_recorded_operations(
    clients: tuple[TestClient, TestClient, TestClient],
) -> None:
    """Return recorded long-running operations for admin views."""

    # Arrange
    client = clients[0]
    payload = {
        "organization": "acme",
        "app": "dashboard",
    }
    await db.operations.create(
        "app.create",
        payload,
    )

    # Act
    response = client.get("/api/operations")

    # Assert
    assert response.status_code == 200
    assert response.json() == [
        {
            "id": 1,
            "kind": "app.create",
            "status": "scheduled",
            "payload": payload,
            "error": None,
            "created_at": response.json()[0]["created_at"],
            "started_at": None,
            "stopped_at": None,
        }
    ]


async def test_database_registry_endpoint_supports_create_list_and_delete(
    clients: tuple[TestClient, TestClient, TestClient],
) -> None:
    """Create, list, and delete one database registry."""

    # Arrange
    client = clients[0]

    # Act
    create_response = client.post(
        "/api/database",
        json={
            "kind": "postgre",
            "name": "primary",
            "host": "db.longlink.internal",
            "port": 5432,
            "username": "longlink",
            "password": "secret",
            "sslmode": "require",
            "maintenance_database": "postgres",
            "location_id": 1,
        },
    )
    list_response = client.get("/api/database")
    delete_response = client.delete("/api/database/primary")

    # Assert
    assert create_response.status_code == 200
    assert create_response.json() == DatabaseRegistryResponse(
        id=1,
        kind=DatabaseKind.postgre,
        name="primary",
        host="db.longlink.internal",
        port=5432,
        username="longlink",
        sslmode="require",
        maintenance_database="postgres",
        location_id=1,
    ).model_dump(mode="json")
    assert list_response.status_code == 200
    assert list_response.json() == [
        DatabaseRegistryResponse(
            id=1,
            kind=DatabaseKind.postgre,
            name="primary",
            host="db.longlink.internal",
            port=5432,
            username="longlink",
            sslmode="require",
            maintenance_database="postgres",
            location_id=1,
        ).model_dump(mode="json")
    ]
    assert delete_response.status_code == 204

    deleted_response = client.get("/api/database/primary")
    assert deleted_response.status_code == 200
    assert deleted_response.json()["deleted_at"] is not None
    assert deleted_response.json()["deleted_by"] is not None


async def test_storage_registry_endpoint_supports_create_list_and_delete(
    clients: tuple[TestClient, TestClient, TestClient],
) -> None:
    """Create, list, and delete one storage registry."""

    # Arrange
    client = clients[0]

    # Act
    create_response = client.post(
        "/api/storage",
        json={
            "kind": "s3",
            "name": "object-store",
            "protocol": "s3",
            "endpoint_url": "https://storage.longlink.internal",
            "access_key_id": "access-key",
            "secret_access_key": "secret-key",
            "location_id": 1,
        },
    )
    list_response = client.get("/api/storage")
    delete_response = client.delete("/api/storage/object-store")

    # Assert
    assert create_response.status_code == 200
    assert create_response.json() == StorageRegistryResponse(
        id=1,
        kind=StorageKind.s3,
        name="object-store",
        protocol="s3",
        endpoint_url="https://storage.longlink.internal",
        access_key_id="access-key",
        location_id=1,
    ).model_dump(mode="json")
    assert list_response.status_code == 200
    assert list_response.json() == [
        StorageRegistryResponse(
            id=1,
            kind=StorageKind.s3,
            name="object-store",
            protocol="s3",
            endpoint_url="https://storage.longlink.internal",
            access_key_id="access-key",
            location_id=1,
        ).model_dump(mode="json")
    ]
    assert delete_response.status_code == 204


async def test_compute_registry_endpoint_supports_create_list_and_delete(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
) -> None:
    """Create, list, and delete one compute registry."""

    # Arrange
    client = clients[0]
    captured: dict[str, object] = {}

    class FakeCompute:
        def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
            captured["kubeconfig"] = kubeconfig
            captured["proxy_secret"] = proxy_secret

        async def cleanup(self) -> None:
            captured["cleanup_calls"] = int(captured.get("cleanup_calls", 0)) + 1

        async def setup(self) -> None:
            captured["setup_calls"] = int(captured.get("setup_calls", 0)) + 1

    monkeypatch.setattr("src.routes.compute.K8s", FakeCompute)

    # Act
    create_response = client.post(
        "/api/compute",
        json={
            "kind": "kubernetes",
            "kubeconfig": "apiVersion: v1\nclusters: []\n",
            "ingress_host": "apps.longlink.internal",
            "location_id": 1,
        },
    )
    list_response = client.get("/api/compute")
    delete_response = client.delete("/api/compute/1")

    # Assert
    assert create_response.status_code == 200
    assert create_response.json() == ComputeRegistryResponse(
        id=1,
        kind=ComputeKind.kubernetes,
        ingress_host="apps.longlink.internal",
        location_id=1,
    ).model_dump(mode="json")
    assert list_response.status_code == 200
    assert list_response.json() == [
        ComputeRegistryResponse(
            id=1,
            kind=ComputeKind.kubernetes,
            ingress_host="apps.longlink.internal",
            location_id=1,
        ).model_dump(mode="json")
    ]
    assert delete_response.status_code == 204
    deleted_response = client.get("/api/compute/1")
    assert deleted_response.status_code == 200
    assert deleted_response.json()["deleted_at"] is not None
    assert deleted_response.json()["deleted_by"] is not None
    assert captured["kubeconfig"] == "apiVersion: v1\nclusters: []\n"
    assert captured["proxy_secret"]
    assert captured["cleanup_calls"] == 1
    assert captured["setup_calls"] == 1
