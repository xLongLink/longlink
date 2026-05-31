from fastapi.testclient import TestClient

from src.models import ComputeRegistryResponse, DatabaseRegistryResponse, StorageRegistryResponse
from src.models.kinds import ComputeKind, DatabaseKind, StorageKind


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
        },
    )
    list_response = client.get("/api/database")
    delete_response = client.delete("/api/database/primary")

    # Assert
    assert create_response.status_code == 200
    assert create_response.json() == {
        "success": True,
        "detail": "Database registry saved",
        "data": DatabaseRegistryResponse(
            id=1,
            kind=DatabaseKind.postgre,
            name="primary",
            host="db.longlink.internal",
            port=5432,
            username="longlink",
            sslmode="require",
            maintenance_database="postgres",
        ).model_dump(mode="json"),
    }
    assert list_response.status_code == 200
    assert list_response.json() == {
        "success": True,
        "detail": "Database registries fetched",
        "data": [
            DatabaseRegistryResponse(
                id=1,
                kind=DatabaseKind.postgre,
                name="primary",
                host="db.longlink.internal",
                port=5432,
                username="longlink",
                sslmode="require",
                maintenance_database="postgres",
            ).model_dump(mode="json")
        ],
    }
    assert delete_response.status_code == 204


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
        },
    )
    list_response = client.get("/api/storage")
    delete_response = client.delete("/api/storage/object-store")

    # Assert
    assert create_response.status_code == 200
    assert create_response.json() == {
        "success": True,
        "detail": "Storage registry saved",
        "data": StorageRegistryResponse(
            id=1,
            kind=StorageKind.s3,
            name="object-store",
            protocol="s3",
            endpoint_url="https://storage.longlink.internal",
            access_key_id="access-key",
        ).model_dump(mode="json"),
    }
    assert list_response.status_code == 200
    assert list_response.json() == {
        "success": True,
        "detail": "Storage registries fetched",
        "data": [
            StorageRegistryResponse(
                id=1,
                kind=StorageKind.s3,
                name="object-store",
                protocol="s3",
                endpoint_url="https://storage.longlink.internal",
                access_key_id="access-key",
            ).model_dump(mode="json")
        ],
    }
    assert delete_response.status_code == 204


async def test_storage_usage_endpoint_returns_summed_object_size(
    clients: tuple[TestClient, TestClient, TestClient], monkeypatch
) -> None:
    """Return storage usage for the registered object store."""

    # Arrange
    client = clients[0]

    class FakeStorage:
        """Fake storage adapter for route testing."""

        def __init__(self, *args, **kwargs) -> None:
            pass

        def usage(self) -> dict[str, int]:
            return {"used_bytes": 512}

        def quota(self) -> dict[str, int | None]:
            return {"quota_bytes": None}

    monkeypatch.setattr("src.routes.storage.StorageAdapter", FakeStorage)

    client.post(
        "/api/storage",
        json={
            "kind": "s3",
            "name": "object-store",
            "protocol": "s3",
            "endpoint_url": "https://storage.longlink.internal",
            "access_key_id": "access-key",
            "secret_access_key": "secret-key",
        },
    )

    # Act
    response = client.get("/api/storage/object-store/usage")

    # Assert
    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "detail": "Storage usage fetched",
        "data": {"used_bytes": 512},
    }


async def test_storage_quota_endpoint_returns_quota_value(
    clients: tuple[TestClient, TestClient, TestClient], monkeypatch
) -> None:
    """Return storage quota for the registered object store."""

    # Arrange
    client = clients[0]

    class FakeStorage:
        """Fake storage adapter for route testing."""

        def __init__(self, *args, **kwargs) -> None:
            pass

        def usage(self) -> dict[str, int]:
            return {"used_bytes": 512}

        def quota(self) -> dict[str, int | None]:
            return {"quota_bytes": 1024}

    monkeypatch.setattr("src.routes.storage.StorageAdapter", FakeStorage)

    client.post(
        "/api/storage",
        json={
            "kind": "s3",
            "name": "object-store",
            "protocol": "s3",
            "endpoint_url": "https://storage.longlink.internal",
            "access_key_id": "access-key",
            "secret_access_key": "secret-key",
        },
    )

    # Act
    response = client.get("/api/storage/object-store/quota")

    # Assert
    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "detail": "Storage quota fetched",
        "data": {"quota_bytes": 1024},
    }


async def test_compute_registry_endpoint_supports_create_list_and_delete(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
) -> None:
    """Create, list, and delete one compute registry."""

    # Arrange
    client = clients[0]
    captured: dict[str, str] = {}

    class FakeCompute:
        def __init__(self, kubeconfig: str) -> None:
            captured["kubeconfig"] = kubeconfig

        async def create_cluster_proxy(self, ingress_name: str) -> None:
            captured["ingress_name"] = ingress_name

    monkeypatch.setattr("src.routes.compute.KubernetesCompute", FakeCompute)

    # Act
    create_response = client.post(
        "/api/compute",
        json={
            "kind": "kubernetes",
            "kubeconfig": "apiVersion: v1\nclusters: []\n",
            "ingress_host": "apps.longlink.internal",
            "ingress_name": "longlink-ingress",
        },
    )
    list_response = client.get("/api/compute")
    delete_response = client.delete("/api/compute/1")

    # Assert
    assert create_response.status_code == 200
    assert create_response.json() == {
        "success": True,
        "detail": "Compute registry saved",
        "data": ComputeRegistryResponse(
            id=1,
            kind=ComputeKind.kubernetes,
            ingress_host="apps.longlink.internal",
            ingress_name="longlink-ingress",
        ).model_dump(mode="json"),
    }
    assert list_response.status_code == 200
    assert list_response.json() == {
        "success": True,
        "detail": "Compute registries fetched",
        "data": [
            ComputeRegistryResponse(
                id=1,
                kind=ComputeKind.kubernetes,
                ingress_host="apps.longlink.internal",
                ingress_name="longlink-ingress",
            ).model_dump(mode="json")
        ],
    }
    assert delete_response.status_code == 204
    assert captured == {"kubeconfig": "apiVersion: v1\nclusters: []\n", "ingress_name": "longlink-ingress"}
