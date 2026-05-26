from fastapi.testclient import TestClient

from src.models import ComputeRegistryResponse, DatabaseRegistryResponse, StorageRegistryResponse


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
                name="object-store",
                protocol="s3",
                endpoint_url="https://storage.longlink.internal",
                access_key_id="access-key",
            ).model_dump(mode="json")
        ],
    }
    assert delete_response.status_code == 204


async def test_compute_registry_endpoint_supports_create_list_and_delete(
    clients: tuple[TestClient, TestClient, TestClient],
) -> None:
    """Create, list, and delete one compute registry."""

    # Arrange
    client = clients[0]

    # Act
    create_response = client.post(
        "/api/compute",
        json={
            "name": "cluster-a",
            "kube_config_path": "/etc/longlink/kubeconfig",
            "ingress_host": "apps.longlink.internal",
            "ingress_name": "longlink-ingress",
        },
    )
    list_response = client.get("/api/compute")
    delete_response = client.delete("/api/compute/cluster-a")

    # Assert
    assert create_response.status_code == 200
    assert create_response.json() == {
        "success": True,
        "detail": "Compute registry saved",
        "data": ComputeRegistryResponse(
            name="cluster-a",
            kube_config_path="/etc/longlink/kubeconfig",
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
                name="cluster-a",
                kube_config_path="/etc/longlink/kubeconfig",
                ingress_host="apps.longlink.internal",
                ingress_name="longlink-ingress",
            ).model_dump(mode="json")
        ],
    }
    assert delete_response.status_code == 204
