from types import SimpleNamespace
from src.models.roles import PlatformRole
from src.models.users import UserSummary
from fastapi.testclient import TestClient
from src.models.compute import ComputeKind, ComputeRegistryResponse
from src.models.storage import StorageKind, StorageRegistryResponse
from src.models.database import DatabaseKind, DatabaseRegistryResponse
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
    location = await db.locations.create("local", "Local testing", user)
    organization = await db.organizations.create("acme", location.id, user)
    application = await db.applications.create(organization.id, "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest", user=user)
    operation = await db.operations.create(OperationKind.app_create, step="verify", application_id=application.id, user=user)

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


async def test_database_registry_endpoint_supports_create_list_and_delete(
    clients: tuple[TestClient, TestClient, TestClient],
    users,
) -> None:
    """Create, list, and delete one database registry."""

    # Arrange
    client = clients[0]
    user1, _, _ = users
    user_summary = UserSummary.model_validate(user1.model_dump())
    location = await db.locations.create("local", "Local testing", user1)

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
                "location_id": str(location.id),
            },
        )
    list_response = client.get("/api/database")
    registry_id = create_response.json()["id"]
    delete_response = client.delete(f"/api/database/{registry_id}")

    # Assert
    assert create_response.status_code == 200
    create_payload = create_response.json()
    assert create_response.json() == DatabaseRegistryResponse(
        id=registry_id,
        kind=DatabaseKind.postgre,
        name="primary",
        host="db.longlink.internal",
        port=5432,
        password="secret",
        username="longlink",
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
            kind=DatabaseKind.postgre,
            name="primary",
            host="db.longlink.internal",
            port=5432,
            password="secret",
            username="longlink",
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

    deleted_response = client.get(f"/api/database/{registry_id}")
    assert deleted_response.status_code == 200
    assert deleted_response.json()["deleted_at"] is not None
    assert deleted_response.json()["deleted_by"] == user_summary.model_dump(mode="json")


async def test_storage_registry_endpoint_supports_create_list_and_delete(
    clients: tuple[TestClient, TestClient, TestClient],
    users,
) -> None:
    """Create, list, and delete one storage registry."""

    # Arrange
    client = clients[0]
    user1, _, _ = users
    user_summary = UserSummary.model_validate(user1.model_dump())
    location = await db.locations.create("local", "Local testing", user1)

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
                "location_id": str(location.id),
            },
        )
    list_response = client.get("/api/storage")
    registry_id = create_response.json()["id"]
    delete_response = client.delete(f"/api/storage/{registry_id}")

    # Assert
    assert create_response.status_code == 200
    create_payload = create_response.json()
    assert create_response.json() == StorageRegistryResponse(
        id=registry_id,
        kind=StorageKind.s3,
        name="object-store",
        protocol="s3",
        endpoint_url="https://storage.longlink.internal",
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
            protocol="s3",
            endpoint_url="https://storage.longlink.internal",
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

    deleted_response = client.get(f"/api/storage/{registry_id}")
    assert deleted_response.status_code == 200
    assert deleted_response.json()["deleted_at"] is not None
    assert deleted_response.json()["deleted_by"] == user_summary.model_dump(mode="json")


async def test_compute_registry_endpoint_supports_create_list_and_delete(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users,
) -> None:
    """Create, list, and delete one compute registry."""

    # Arrange
    client = clients[0]
    user1, _, _ = users
    user_summary = UserSummary.model_validate(user1.model_dump())
    location = await db.locations.create("local", "Local testing", user1)
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
                "location_id": str(location.id),
            },
        )
    list_response = client.get("/api/compute")
    registry_id = create_response.json()["id"]
    delete_response = client.delete(f"/api/compute/{registry_id}")

    # Assert
    assert create_response.status_code == 200
    create_payload = create_response.json()
    assert create_response.json() == ComputeRegistryResponse(
        id=registry_id,
        kind=ComputeKind.kubernetes,
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
    deleted_response = client.get(f"/api/compute/{registry_id}")
    assert deleted_response.status_code == 200
    assert deleted_response.json()["deleted_at"] is not None
    assert deleted_response.json()["deleted_by"] == user_summary.model_dump(mode="json")
    assert captured["kubeconfig"] == "apiVersion: v1\nclusters: []\n"
    assert captured["proxy_secret"]
    assert captured["cleanup_calls"] == 1
    assert captured["setup_calls"] == 1
