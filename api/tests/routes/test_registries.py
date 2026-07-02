from types import SimpleNamespace
from datetime import UTC, datetime
from src.models.users import UserSummary
from fastapi.testclient import TestClient
from src.models.computes import ComputeKind, ComputeRegistryResponse
from src.models.storages import (StorageKind, StorageBucketResponse,
                                StorageObjectResponse,
                                StorageRegistryResponse)
from src.models.countries import Country
from src.models.databases import (DatabaseKind, DatabaseUsageResponse,
                                  DatabaseRegistryResponse)
from src.models.operations import OperationKind, OperationResponse
from src.database.services.users import users
from src.database.services.compute import compute
from src.database.services.storage import storage
from src.database.services.database import database
from src.database.services.locations import locations
from src.database.services.operations import operations
from src.database.services.applications import applications
from src.database.services.organizations import organizations

db = SimpleNamespace(
    applications=applications,
    compute=compute,
    database=database,
    locations=locations,
    operations=operations,
    organizations=organizations,
    storage=storage,
    users=users,
)


async def test_operations_endpoint_returns_recorded_operations(
    clients: tuple[TestClient, TestClient, TestClient],
    users,
) -> None:
    """Return recorded long-running operations for admin views."""

    # Arrange
    client = clients[0]
    user = users[0]
    location = await db.locations.create("local", "Local testing", user, Country.CH)
    organization = await db.organizations.create("acme", location.id, user)
    application = await db.applications.create(organization.id, "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest", user=user)
    operation = await db.operations.create(OperationKind.application_create, step="verify", application_id=application.id, user=user)

    # Act
    response = client.get("/api/operations")

    # Assert
    assert response.status_code == 200
    assert response.json() == [
        OperationResponse.model_validate(
            {
                **operation.model_dump(),
                "status": operation.status,
                "created_at": response.json()[0]["created_at"],
                "started_at": None,
                "stopped_at": None,
            }
        ).model_dump(mode="json")
    ]


async def test_database_registry_endpoint_supports_create_and_list(
    clients: tuple[TestClient, TestClient, TestClient],
    users,
) -> None:
    """Create, list, and delete one database registry."""

    # Arrange
    client = clients[0]
    user1, _, _ = users
    user_summary = UserSummary.model_validate(user1.model_dump())
    location = await db.locations.create("local", "Local testing", user1, Country.CH)

    # Act
    create_response = client.post(
        "/api/databases",
        json={
            "kind": "postgresql",
            "name": "primary",
            "host": "db.longlink.internal",
            "port": 5432,
            "username": "longlink",
            "password": "secret",
            "runtime_host": "db.runtime.longlink.internal",
            "runtime_port": 15432,
            "location_id": str(location.id),
        },
    )
    list_response = client.get("/api/databases")
    registry_id = create_response.json()["id"]
    delete_response = client.delete(f"/api/databases/{registry_id}")
    get_response = client.get(f"/api/databases/{registry_id}")

    # Assert
    assert create_response.status_code == 200
    create_payload = create_response.json()
    assert create_response.json() == DatabaseRegistryResponse(
        id=registry_id,
        kind=DatabaseKind.postgresql,
        name="primary",
        slug="primary",
        host="db.longlink.internal",
        port=5432,
        username="longlink",
        runtime_host="db.runtime.longlink.internal",
        runtime_port=15432,
        location_id=location.id,
        created_at=create_payload["created_at"],
        created_by=user_summary,
        updated_at=create_payload["updated_at"],
        updated_by=user_summary,
        deleted_at=None,
        deleted_by=None,
    ).model_dump(mode="json")
    assert list_response.status_code == 200
    assert list_response.json() == [
        DatabaseRegistryResponse(
            id=registry_id,
            kind=DatabaseKind.postgresql,
            name="primary",
            slug="primary",
            host="db.longlink.internal",
            port=5432,
            username="longlink",
            runtime_host="db.runtime.longlink.internal",
            runtime_port=15432,
            location_id=location.id,
            created_at=create_payload["created_at"],
            created_by=user_summary,
            updated_at=create_payload["updated_at"],
            updated_by=user_summary,
            deleted_at=None,
            deleted_by=None,
        ).model_dump(mode="json")
    ]
    assert delete_response.status_code == 204
    assert get_response.status_code == 404


async def test_database_usage_endpoint_returns_backend_capacity(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users,
) -> None:
    """Return backend storage usage for one database registry."""

    # Arrange
    client = clients[0]
    user1, _, _ = users
    location = await db.locations.create("local", "Local testing", user1, Country.CH)
    create_response = client.post(
        "/api/databases",
        json={
            "kind": "postgresql",
            "name": "primary",
            "host": "db.longlink.internal",
            "port": 5432,
            "username": "longlink",
            "password": "secret",
            "location_id": str(location.id),
        },
    )
    registry_id = create_response.json()["id"]

    class FakePostgres:
        def __init__(self, host: str, port: int, username: str, password: str) -> None:
            self.host = host
            self.port = port
            self.username = username
            self.password = password

        async def usage(self) -> dict[str, int]:
            return {"space_used": 987654321}

    monkeypatch.setattr("src.routes.databases.Postgres", FakePostgres)

    # Act
    response = client.get(f"/api/databases/{registry_id}/usage")

    # Assert
    assert response.status_code == 200
    assert response.json() == DatabaseUsageResponse(space_used=987654321).model_dump(mode="json")


async def test_storage_registry_endpoint_supports_create_and_list(
    clients: tuple[TestClient, TestClient, TestClient],
    users,
) -> None:
    """Create, list, and delete one storage registry."""

    # Arrange
    client = clients[0]
    user1, _, _ = users
    user_summary = UserSummary.model_validate(user1.model_dump())
    location = await db.locations.create("local", "Local testing", user1, Country.CH)

    # Act
    create_response = client.post(
        "/api/storages",
        json={
            "kind": "s3",
            "name": "object-store",
            "protocol": "s3",
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
    assert create_response.json() == StorageRegistryResponse(
        id=registry_id,
        kind=StorageKind.s3,
        name="object-store",
        slug="object-store",
        protocol="s3",
        endpoint_url="https://storage.longlink.internal",
        runtime_endpoint_url="https://storage.runtime.longlink.internal",
        access_key_id="access-key",
        location_id=location.id,
        created_at=create_payload["created_at"],
        created_by=user_summary,
        updated_at=create_payload["updated_at"],
        updated_by=user_summary,
        deleted_at=None,
        deleted_by=None,
    ).model_dump(mode="json")
    assert list_response.status_code == 200
    assert list_response.json() == [
        StorageRegistryResponse(
            id=registry_id,
            kind=StorageKind.s3,
            name="object-store",
            slug="object-store",
            protocol="s3",
            endpoint_url="https://storage.longlink.internal",
            runtime_endpoint_url="https://storage.runtime.longlink.internal",
            access_key_id="access-key",
            location_id=location.id,
            created_at=create_payload["created_at"],
            created_by=user_summary,
            updated_at=create_payload["updated_at"],
            updated_by=user_summary,
            deleted_at=None,
            deleted_by=None,
        ).model_dump(mode="json")
    ]
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
    location = await db.locations.create("local", "Local testing", user1, Country.CH)
    create_response = client.post(
        "/api/storages",
        json={
            "kind": "s3",
            "name": "object-store",
            "protocol": "s3",
            "endpoint_url": "https://storage.longlink.internal",
            "access_key_id": "access-key",
            "secret_access_key": "secret-key",
            "location_id": str(location.id),
        },
    )
    registry_id = create_response.json()["id"]

    class FakeS3:
        def __init__(self, protocol: str, endpoint_url: str, access_key_id: str, secret_access_key: str) -> None:
            self.protocol = protocol
            self.endpoint_url = endpoint_url
            self.access_key_id = access_key_id
            self.secret_access_key = secret_access_key

        async def buckets(self) -> list[str]:
            return ["alpha", "beta"]

    monkeypatch.setattr("src.routes.storages.S3", FakeS3)

    # Act
    response = client.get(f"/api/storages/{registry_id}/buckets")

    # Assert
    assert response.status_code == 200
    assert response.json() == [
        StorageBucketResponse(name="alpha").model_dump(mode="json"),
        StorageBucketResponse(name="beta").model_dump(mode="json"),
    ]


async def test_storage_object_endpoint_returns_bucket_objects(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users,
) -> None:
    """Return object metadata for one storage bucket."""

    # Arrange
    client = clients[0]
    user1, _, _ = users
    last_modified = datetime(2026, 7, 1, tzinfo=UTC)
    location = await db.locations.create("local", "Local testing", user1, Country.CH)
    create_response = client.post(
        "/api/storages",
        json={
            "kind": "s3",
            "name": "object-store",
            "protocol": "s3",
            "endpoint_url": "https://storage.longlink.internal",
            "access_key_id": "access-key",
            "secret_access_key": "secret-key",
            "location_id": str(location.id),
        },
    )
    registry_id = create_response.json()["id"]

    class FakeS3:
        def __init__(self, protocol: str, endpoint_url: str, access_key_id: str, secret_access_key: str) -> None:
            self.protocol = protocol
            self.endpoint_url = endpoint_url
            self.access_key_id = access_key_id
            self.secret_access_key = secret_access_key

        async def objects(self, bucket_name: str, *, limit: int = 1000) -> list[dict[str, object]]:
            assert bucket_name == "alpha"
            assert limit == 1000
            return [
                {
                    "key": "reports/july.csv",
                    "size": 123,
                    "etag": '"abc123"',
                    "last_modified": last_modified,
                }
            ]

    monkeypatch.setattr("src.routes.storages.S3", FakeS3)

    # Act
    response = client.get(f"/api/storages/{registry_id}/buckets/alpha/objects")

    # Assert
    assert response.status_code == 200
    assert response.json() == [
        StorageObjectResponse(
            key="reports/july.csv",
            size=123,
            etag='"abc123"',
            last_modified=last_modified,
        ).model_dump(mode="json")
    ]


async def test_compute_registry_endpoint_supports_create_and_list(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users,
) -> None:
    """Create, list, and delete one compute registry."""

    # Arrange
    client = clients[0]
    user1, _, _ = users
    user_summary = UserSummary.model_validate(user1.model_dump())
    location = await db.locations.create("local", "Local testing", user1, Country.CH)
    captured: dict[str, object] = {}

    class FakeCompute:
        def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
            captured["kubeconfig"] = kubeconfig
            captured["proxy_secret"] = proxy_secret

        async def setup(self) -> None:
            captured["setup_calls"] = int(captured.get("setup_calls", 0)) + 1

    monkeypatch.setattr("src.routes.computes.K8s", FakeCompute)

    # Act
    create_response = client.post(
        "/api/computes",
        json={
            "kind": "kubernetes",
            "name": "primary",
            "kubeconfig": "apiVersion: v1\nclusters: []\n",
            "ingress_host": "apps.longlink.internal",
            "location_id": str(location.id),
        },
    )
    list_response = client.get("/api/computes")
    registry_id = create_response.json()["id"]
    delete_response = client.delete(f"/api/computes/{registry_id}")
    get_response = client.get(f"/api/computes/{registry_id}")

    # Assert
    assert create_response.status_code == 200
    create_payload = create_response.json()
    assert create_response.json() == ComputeRegistryResponse(
        id=registry_id,
        kind=ComputeKind.kubernetes,
        name="primary",
        slug="primary",
        ingress_host="apps.longlink.internal",
        location_id=location.id,
        created_at=create_payload["created_at"],
        created_by=user_summary,
        updated_at=create_payload["updated_at"],
        updated_by=user_summary,
        deleted_at=None,
        deleted_by=None,
    ).model_dump(mode="json")
    assert list_response.status_code == 200
    assert list_response.json() == [
        ComputeRegistryResponse(
            id=registry_id,
            kind=ComputeKind.kubernetes,
            name="primary",
            slug="primary",
            ingress_host="apps.longlink.internal",
            location_id=location.id,
            created_at=create_payload["created_at"],
            created_by=user_summary,
            updated_at=create_payload["updated_at"],
            updated_by=user_summary,
            deleted_at=None,
            deleted_by=None,
        ).model_dump(mode="json")
    ]
    assert delete_response.status_code == 204
    assert get_response.status_code == 404
    assert captured["kubeconfig"] == "apiVersion: v1\nclusters: []\n"
    assert captured["proxy_secret"]
    assert captured["setup_calls"] == 1
