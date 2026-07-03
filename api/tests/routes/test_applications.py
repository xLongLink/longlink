import json
import pytest
from types import SimpleNamespace
from datetime import UTC, datetime
from src.models.roles import ApplicationRoles, OrganizationRoles
from fastapi.testclient import TestClient
from src.models.computes import ComputeKind
from src.models.metadata import LongLinkMetadata, EnvironmentMetadata
from src.models.storages import StorageKind
from src.database.session import get_session
from src.models.countries import Country
from src.models.databases import DatabaseKind
from src.models.operations import OperationKind
from kubernetes.client.rest import ApiException
from src.models.applications import ApplicationStatus
from src.database.models.users import User
from src.database.services.users import users
from src.adapters.database.shared import SharedUser
from src.database.services.compute import compute
from src.database.services.storage import storage
from src.database.services.database import database
from src.database.models.association import UserApplication, UserOrganization
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


async def test_list_organization_apps_returns_app_membership_role(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return the application-specific role instead of the organization role."""

    # Arrange
    owner = users[0]
    user = users[1]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    app = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=owner,
    )

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=user.id,
                organization_id=organization.id,
                role_name=OrganizationRoles.read,
            )
        )
        session.add(
            UserApplication(
                user_id=user.id,
                organization_id=organization.id,
                application_id=app.id,
                role_name=ApplicationRoles.write,
            )
        )
        await session.commit()

    client = clients[1]

    # Act
    response = client.get(f"/api/organizations/{organization.id}/applications")

    # Assert
    assert response.status_code == 200
    payload = response.json()
    assert [item["id"] for item in payload] == [str(app.id)]
    assert payload[0]["role"] == ApplicationRoles.write


async def test_list_organization_apps_returns_creator_app_admin_role(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return the creator's automatically assigned application admin role."""

    # Arrange
    user = users[0]
    location = await db.locations.create("local", "Local testing", user, Country.CH)
    organization = await db.organizations.create("acme", location.id, user)
    app = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )
    client = clients[0]

    # Act
    response = client.get(f"/api/organizations/{organization.id}/applications")

    # Assert
    assert response.status_code == 200
    payload = response.json()
    assert [item["id"] for item in payload] == [str(app.id)]
    assert payload[0]["role"] == ApplicationRoles.admin


async def test_list_apps_without_organization_returns_all_apps_for_admin(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return all applications when an admin does not filter by organization."""

    # Arrange
    user = users[0]
    location = await db.locations.create("local", "Local testing", user, Country.CH)
    acme = await db.organizations.create("acme", location.id, user)
    globex = await db.organizations.create("globex", location.id, user)
    dashboard = await db.applications.create(
        acme.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )
    console = await db.applications.create(
        globex.id,
        "console",
        slug="console",
        image="ghcr.io/longlink/console:latest",
        user=user,
    )
    client = clients[0]

    # Act
    response = client.get("/api/applications")

    # Assert
    assert response.status_code == 200
    assert {item["id"] for item in response.json()} == {str(dashboard.id), str(console.id)}


async def test_list_apps_without_organization_requires_admin(
    clients: tuple[TestClient, TestClient, TestClient],
) -> None:
    """Reject application listing for non-admin users."""

    # Arrange
    client = clients[1]

    # Act
    response = client.get("/api/applications")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Administrator privileges required"}


async def test_list_organization_apps_returns_404_for_non_member(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject application listing when the user does not belong to the organization."""

    # Arrange
    owner = users[0]
    user = users[1]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=owner,
    )
    client = clients[1]

    # Act
    response = client.get(f"/api/organizations/{organization.id}/applications")

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": f"Organization '{organization.id}' not found"}


async def test_create_app_returns_app_response(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Create an app and return the app response payload."""

    # Arrange
    user = users[0]
    local_location = await db.locations.create(
        "local", "Local testing", user, Country.CH
    )
    remote_location = await db.locations.create(
        "remote", "Remote testing", user, Country.CH
    )
    organization = await db.organizations.create("acme", remote_location.id, user)
    await db.compute.create(
        kind=ComputeKind.kubernetes,
        name="local",
        kubeconfig="apiVersion: v1\nclusters: []\n",
        ingress_host="apps.local.longlink.internal",
        location_id=local_location.id,
        user=user,
    )
    await db.compute.create(
        kind=ComputeKind.kubernetes,
        name="remote",
        kubeconfig="apiVersion: v1\nclusters: []\n",
        ingress_host="apps.remote.longlink.internal",
        location_id=remote_location.id,
        user=user,
    )
    await db.database.create(
        kind=DatabaseKind.postgresql,
        name="local",
        host="db.local.longlink.internal",
        port=5432,
        username="longlink",
        password="secret",
        location_id=local_location.id,
        user=user,
    )
    await db.database.create(
        kind=DatabaseKind.postgresql,
        name="remote",
        host="db.remote.longlink.internal",
        port=5432,
        username="longlink",
        password="secret",
        runtime_host="db.runtime.longlink.internal",
        runtime_port=15432,
        location_id=remote_location.id,
        user=user,
    )
    await db.storage.create(
        kind=StorageKind.s3,
        name="remote",
        protocol="http",
        endpoint_url="http://storage.control.longlink.internal",
        runtime_endpoint_url="http://storage.runtime.longlink.internal:19000",
        access_key_id="storage-access",
        secret_access_key="storage-secret",
        location_id=remote_location.id,
        user=user,
    )

    async def fake_metadata(image: str) -> LongLinkMetadata:
        return LongLinkMetadata(version="20250623_120000", sdk="0.1.0")

    monkeypatch.setattr("src.operations.provisioning.images.metadata", fake_metadata)

    captured: dict[str, object] = {}
    captured_buckets: list[tuple[str, ...]] = []

    class FakeCompute:
        """Fake compute adapter for app creation tests."""

        def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
            captured["kubeconfig"] = kubeconfig
            captured["proxy_secret"] = proxy_secret

        async def namespace(self, organization: str) -> None:
            captured["namespace"] = organization

        async def application(
            self,
            organization: str,
            application: str,
            image: str,
            port: int,
            secrets: dict[str, str],
        ) -> None:
            captured["application"] = {
                "organization": organization,
                "application": application,
                "image": image,
                "port": port,
                "secrets": secrets,
            }

    class FakeDatabase:
        """Fake database adapter for app creation tests."""

        def __init__(
            self,
            host: str,
            port: int,
            username: str,
            password: str,
            runtime_host: str | None = None,
            runtime_port: int | None = None,
        ) -> None:
            captured["database"] = {
                "host": host,
                "port": port,
                "username": username,
                "password": password,
                "runtime_host": runtime_host,
                "runtime_port": runtime_port,
            }

        async def schema(self, organization: str, application: str) -> str:
            captured["schema"] = {
                "organization": organization,
                "application": application,
            }
            return "postgresql://fake"

        async def sync_users(
            self, organization: str, users: list[SharedUser]
        ) -> None:
            captured["sync_users"] = {
                "organization": organization,
                "users": users,
            }

    class FakeStorage:
        """Fake storage adapter for app creation tests."""

        def __init__(self, protocol: str, endpoint_url: str, access_key_id: str, secret_access_key: str) -> None:
            captured["storage"] = {
                "protocol": protocol,
                "endpoint_url": endpoint_url,
                "access_key_id": access_key_id,
                "secret_access_key": secret_access_key,
            }

        async def shared_bucket(self, organization: str) -> str:
            captured_buckets.append(("shared", organization))
            return f"longlink-{organization}-shared"

        async def bucket(self, organization: str, application: str) -> str:
            captured_buckets.append(("application", organization, application))
            return f"longlink-{organization}-{application}"

    monkeypatch.setattr("src.operations.provisioning.K8s", FakeCompute)
    monkeypatch.setattr("src.operations.provisioning.Postgres", FakeDatabase)
    monkeypatch.setattr("src.operations.provisioning.S3", FakeStorage)
    client = clients[0]

    # Act
    response = client.post(
        f"/api/organizations/{organization.id}/applications",
        json={
            "name": "dashboard",
            "image": "ghcr.io/longlink/dashboard:latest",
            "description": "Dashboard app",
            "envs": {
                "API_KEY": "secret-value",
                "LONGLINK_ENV": "development",
                "LONGLINK_INTERNAL": "user-controlled",
                "PORT": "8080",
            },
        },
    )

    # Assert
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "creating"
    assert payload["description"] == "Dashboard app"
    assert payload["version"] == "20250623_120000"
    assert payload["sdk_version"] == "0.1.0"
    assert captured["namespace"] == "acme"
    assert captured["proxy_secret"]
    assert captured["schema"] == {"organization": "acme", "application": "dashboard"}
    assert captured_buckets == [("shared", "acme"), ("application", "acme", "dashboard")]
    sync_payload = captured["sync_users"]
    assert isinstance(sync_payload, dict)
    synced_users = sync_payload["users"]
    assert isinstance(synced_users, list)
    assert all(isinstance(synced_user, SharedUser) for synced_user in synced_users)
    assert sync_payload["organization"] == "acme"
    assert synced_users[0].email == user.email
    application_payload = captured["application"]
    assert isinstance(application_payload, dict)
    assert application_payload["organization"] == "acme"
    assert application_payload["application"] == "dashboard"
    application_secrets = application_payload["secrets"]
    assert isinstance(application_secrets, dict)
    assert application_secrets["API_KEY"] == "secret-value"
    assert application_secrets["LONGLINK_ENV"] == "production"
    assert application_secrets["LONGLINK_DATABASE_URL"] == "postgresql+asyncpg://fake"
    assert application_secrets["LONGLINK_STORAGE_URL"].startswith("s3+http://")
    assert "LONGLINK_INTERNAL" not in application_secrets


async def test_create_app_returns_409_when_image_metadata_is_missing(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Reject app creation when the image cannot be inspected."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)

    async def fake_metadata(image: str) -> None:
        """Pretend the registry inspection failed or returned invalid metadata."""

        return None

    monkeypatch.setattr("src.operations.provisioning.images.metadata", fake_metadata)
    client = clients[0]

    # Act
    response = client.post(
        f"/api/organizations/{organization.id}/applications",
        json={"name": "dashboard", "image": "ghcr.io/longlink/dashboard:latest"},
    )

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Image metadata could not be inspected"}
    assert await db.applications.list_by_organization(organization.id) == []


async def test_create_app_requires_storage_registry_for_required_storage_envs(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Reject apps that require platform storage envs when no storage backend is configured."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    await db.compute.create(
        kind=ComputeKind.kubernetes,
        name="local",
        kubeconfig="apiVersion: v1\nclusters: []\n",
        ingress_host="apps.local.longlink.internal",
        location_id=location.id,
        user=owner,
    )
    await db.database.create(
        kind=DatabaseKind.postgresql,
        name="primary",
        host="db.local.longlink.internal",
        port=5432,
        username="longlink",
        password="secret",
        location_id=location.id,
        user=owner,
    )

    async def fake_metadata(image: str) -> LongLinkMetadata:
        """Return metadata for an app that needs platform-managed storage."""

        return LongLinkMetadata(
            version="20250623_120000",
            sdk="0.1.0",
            environments=[
                EnvironmentMetadata(name="LONGLINK_STORAGE_URL", type="str", required=True),
            ],
        )

    monkeypatch.setattr("src.operations.provisioning.images.metadata", fake_metadata)
    client = clients[0]

    # Act
    response = client.post(
        f"/api/organizations/{organization.id}/applications",
        json={
            "name": "dashboard",
            "image": "ghcr.io/longlink/dashboard:latest",
            "envs": {"LONGLINK_STORAGE_URL": "s3+http://user-supplied"},
        },
    )

    # Assert
    assert response.status_code == 503
    expected_detail = (
        f"No storage configured for location '{organization.location_id}' "
        "required by image environment variables: LONGLINK_STORAGE_URL"
    )
    assert response.json() == {
        "detail": expected_detail
    }
    assert await db.applications.list_by_organization(organization.id) == []


async def test_create_app_returns_409_for_overlong_runtime_bucket_name(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject app creation when combined runtime resource names exceed backend limits."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    client = clients[0]

    # Act
    response = client.post(
        f"/api/organizations/{organization.id}/applications",
        json={"name": "a" * 50, "image": "ghcr.io/longlink/dashboard:latest"},
    )

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "S3 bucket name must be at most 63 characters"}
    assert await db.applications.list_by_organization(organization.id) == []


async def test_create_app_returns_403_for_regular_member(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Reject application creation when the organization member lacks deployment permissions."""

    # Arrange
    owner = users[0]
    regular_member = users[1]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=regular_member.id,
                organization_id=organization.id,
                role_name=OrganizationRoles.write,
            )
        )
        await session.commit()

    async def fail_create_application_runtime(*args, **kwargs):
        """Fail if the authorization check lets provisioning start."""

        raise AssertionError("Regular organization members must not start provisioning")

    monkeypatch.setattr("src.routes.applications.provisioning.create_application_runtime", fail_create_application_runtime)
    client = clients[1]

    # Act
    response = client.post(
        f"/api/organizations/{organization.id}/applications",
        json={"name": "dashboard", "image": "ghcr.io/longlink/dashboard:latest"},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Application creation permissions required"}


async def test_get_app_logs_returns_pod_logs(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Return the recent pod logs for one app."""

    # Arrange
    user = users[0]
    location = await db.locations.create("local", "Local testing", user, Country.CH)
    organization = await db.organizations.create("acme", location.id, user)
    app = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )
    await db.compute.create(
        kind=ComputeKind.kubernetes,
        name="local",
        kubeconfig=(
            "apiVersion: v1\n"
            "clusters:\n"
            "- name: k3d-compute\n"
            "  cluster:\n"
            "    server: https://0.0.0.0:8001\n"
            "contexts:\n"
            "- name: k3d-compute\n"
            "  context:\n"
            "    cluster: k3d-compute\n"
            "    user: admin@k3d-compute\n"
            "current-context: k3d-compute\n"
            "kind: Config\n"
            "preferences: {}\n"
            "users:\n"
            "- name: admin@k3d-compute\n"
            "  user:\n"
            "    client-certificate-data: Y2VydA==\n"
            "    client-key-data: a2V5\n"
        ),
        ingress_host="localhost:8443",
        location_id=location.id,
        user=user,
    )
    captured: dict[str, object] = {}

    class FakeCompute:
        """Fake compute adapter for app log tests."""

        def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
            captured["kubeconfig"] = kubeconfig
            captured["proxy_secret"] = proxy_secret

        async def logs(
            self, organization: str, application: str, lines: int = 200
        ) -> str:
            captured["logs"] = {
                "organization": organization,
                "application": application,
                "lines": lines,
            }
            return "line 1\nline 2"

    monkeypatch.setattr("src.routes.applications.K8s", FakeCompute)
    client = clients[0]

    # Act
    response = client.get(f"/api/applications/{app.id}/logs")

    # Assert
    assert response.status_code == 200
    assert response.text == "line 1\nline 2"
    assert response.headers["content-type"].startswith("text/plain")
    assert captured["logs"] == {
        "organization": "acme",
        "application": "dashboard",
        "lines": 200,
    }


async def test_delete_application_soft_deletes_and_queues_removal(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Soft-delete an application and queue immediate runtime removal."""

    # Arrange
    user = users[0]
    location = await db.locations.create("local", "Local testing", user, Country.CH)
    organization = await db.organizations.create("acme", location.id, user)
    app = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )
    client = clients[0]

    # Act
    response = client.delete(f"/api/applications/{app.id}")

    # Assert
    assert response.status_code == 204
    assert await db.applications.get_by_id(app.id) is None
    deleted = await db.applications.get_by_id(app.id, include_deleted=True)
    assert deleted is not None
    assert deleted.deleted_id == user.id
    recorded_operations = await db.operations.list()
    assert len(recorded_operations) == 1
    assert recorded_operations[0].kind == OperationKind.application_delete
    assert recorded_operations[0].step == "remove"
    assert recorded_operations[0].application_id == app.id
    assert recorded_operations[0].scheduled_at is not None


async def test_proxy_app_forwards_request_to_internal_service(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Proxy an app request into the internal service."""

    # Arrange
    user = users[0]
    local_location = await db.locations.create(
        "local", "Local testing", user, Country.CH
    )
    remote_location = await db.locations.create(
        "remote", "Remote testing", user, Country.CH
    )
    organization = await db.organizations.create("acme", remote_location.id, user)
    app = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/xlonglink/sample:latest",
        user=user,
    )
    await db.applications.set_status(app.id, ApplicationStatus.running)
    await db.compute.create(
        kind=ComputeKind.kubernetes,
        name="local",
        kubeconfig=(
            "apiVersion: v1\n"
            "clusters:\n"
            "- name: k3d-compute\n"
            "  cluster:\n"
            "    server: https://0.0.0.0:8001\n"
            "contexts:\n"
            "- name: k3d-compute\n"
            "  context:\n"
            "    cluster: k3d-compute\n"
            "    user: admin@k3d-compute\n"
            "current-context: k3d-compute\n"
            "kind: Config\n"
            "preferences: {}\n"
            "users:\n"
            "- name: admin@k3d-compute\n"
            "  user:\n"
            "    client-certificate-data: Y2VydA==\n"
            "    client-key-data: a2V5\n"
        ),
        ingress_host="localhost:8443",
        location_id=local_location.id,
        user=user,
    )
    await db.compute.create(
        kind=ComputeKind.kubernetes,
        name="remote",
        kubeconfig=(
            "apiVersion: v1\n"
            "clusters:\n"
            "- name: k3d-compute\n"
            "  cluster:\n"
            "    server: https://0.0.0.0:8001\n"
            "contexts:\n"
            "- name: k3d-compute\n"
            "  context:\n"
            "    cluster: k3d-compute\n"
            "    user: admin@k3d-compute\n"
            "current-context: k3d-compute\n"
            "kind: Config\n"
            "preferences: {}\n"
            "users:\n"
            "- name: admin@k3d-compute\n"
            "  user:\n"
            "    client-certificate-data: Y2VydA==\n"
            "    client-key-data: a2V5\n"
        ),
        ingress_host="localhost:8443",
        location_id=remote_location.id,
        user=user,
    )
    await db.compute.create(
        kind=ComputeKind.kubernetes,
        name="remote-extra",
        kubeconfig=(
            "apiVersion: v1\n"
            "clusters:\n"
            "- name: k3d-compute\n"
            "  cluster:\n"
            "    server: https://0.0.0.0:8001\n"
            "contexts:\n"
            "- name: k3d-compute\n"
            "  context:\n"
            "    cluster: k3d-compute\n"
            "    user: admin@k3d-compute\n"
            "current-context: k3d-compute\n"
            "kind: Config\n"
            "preferences: {}\n"
            "users:\n"
            "- name: admin@k3d-compute\n"
            "  user:\n"
            "    client-certificate-data: Y2VydA==\n"
            "    client-key-data: a2V5\n"
        ),
        ingress_host="localhost:9443",
        location_id=remote_location.id,
        user=user,
    )
    client = clients[0]
    captured: dict[str, object] = {}

    class FakeCompute:
        def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
            captured["kubeconfig"] = kubeconfig
            captured["proxy_secret"] = proxy_secret

        def proxy(
            self,
            organization: str,
            application: str,
            path: str,
            method: str,
            query_params,
            headers,
            body,
        ):
            captured["organization"] = organization
            captured["application"] = application
            captured["path"] = path
            captured["method"] = method
            captured["query_params"] = query_params
            captured["headers"] = headers
            captured["body"] = body
            return (
                b"proxied",
                200,
                {"content-type": "text/plain", "set-cookie": "tenant=owned"},
            )

    monkeypatch.setattr("src.routes.applications.K8s", FakeCompute)

    # Act
    response = client.post(
        f"/api/applications/{app.id}/proxy/anything?answer=42",
        json={"sku": "SKU-001", "name": "Warehouse Widget", "quantity": 10},
    )

    # Assert
    assert response.status_code == 200
    assert response.text == "proxied"
    assert captured["organization"] == "acme"
    assert captured["application"] == "dashboard"
    assert captured["path"] == "anything"
    assert captured["method"] == "POST"
    assert captured["query_params"] == [("answer", "42")]
    request_body = captured["body"]
    assert isinstance(request_body, bytes)
    assert json.loads(request_body.decode("utf-8")) == {
        "sku": "SKU-001",
        "name": "Warehouse Widget",
        "quantity": 10,
    }
    headers = captured["headers"]
    assert isinstance(headers, dict)
    forwarded_headers = {str(key).lower(): value for key, value in headers.items()}
    assert forwarded_headers["content-type"] == "application/json"
    assert "content-length" not in forwarded_headers
    assert forwarded_headers["x-user-id"] == str(user.id)
    assert "cookie" not in forwarded_headers
    assert "set-cookie" not in response.headers


async def test_proxy_app_requires_application_role_for_regular_member(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject app proxy access for regular org members without an app role."""

    # Arrange
    owner = users[0]
    user = users[1]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    app = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/xlonglink/sample:latest",
        user=owner,
    )
    await db.applications.set_status(app.id, ApplicationStatus.running)
    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=user.id,
                organization_id=organization.id,
                role_name=OrganizationRoles.read,
            )
        )
        await session.commit()

    client = clients[1]

    # Act
    response = client.get(f"/api/applications/{app.id}/proxy/metadata.json")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Application access required"}


async def test_proxy_app_strips_conditional_headers_before_forwarding(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Drop conditional request headers before forwarding through Kubernetes."""

    # Arrange
    user = users[0]
    local_location = await db.locations.create(
        "local", "Local testing", user, Country.CH
    )
    remote_location = await db.locations.create(
        "remote", "Remote testing", user, Country.CH
    )
    organization = await db.organizations.create("acme", remote_location.id, user)
    app = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/xlonglink/sample:latest",
        user=user,
    )
    await db.applications.set_status(app.id, ApplicationStatus.running)
    await db.compute.create(
        kind=ComputeKind.kubernetes,
        name="local",
        kubeconfig=(
            "apiVersion: v1\n"
            "clusters:\n"
            "- name: k3d-compute\n"
            "  cluster:\n"
            "    server: https://0.0.0.0:8001\n"
            "contexts:\n"
            "- name: k3d-compute\n"
            "  context:\n"
            "    cluster: k3d-compute\n"
            "    user: admin@k3d-compute\n"
            "current-context: k3d-compute\n"
            "kind: Config\n"
            "preferences: {}\n"
            "users:\n"
            "- name: admin@k3d-compute\n"
            "  user:\n"
            "    client-certificate-data: Y2VydA==\n"
            "    client-key-data: a2V5\n"
        ),
        ingress_host="localhost:9443",
        location_id=remote_location.id,
        user=user,
    )
    client = clients[0]
    captured: dict[str, object] = {}

    class FakeCompute:
        def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
            captured["proxy_secret"] = proxy_secret

        def proxy(
            self,
            organization: str,
            application: str,
            path: str,
            method: str,
            query_params,
            headers,
            body,
        ) -> tuple[bytes, int, dict[str, str]]:
            captured["headers"] = headers
            return b"proxied", 200, {"content-type": "text/plain"}

    monkeypatch.setattr("src.routes.applications.K8s", FakeCompute)

    # Act
    response = client.get(
        f"/api/applications/{app.id}/proxy/i18n/en.json",
        headers={
            "If-None-Match": '"abc"',
            "If-Modified-Since": "Tue, 01 Jun 2020 00:00:00 GMT",
            "X-Test": "present",
            "X-User-Id": "00000000-0000-0000-0000-000000000000",
        },
    )

    # Assert
    assert response.status_code == 200
    forwarded_values = captured["headers"]
    assert isinstance(forwarded_values, dict)
    forwarded_headers = {str(key).lower() for key in forwarded_values}
    assert "if-none-match" not in forwarded_headers
    assert "if-modified-since" not in forwarded_headers
    assert "x-test" in forwarded_headers
    assert forwarded_values.get("x-test") == "present"
    assert forwarded_values.get("x-user-id") == str(user.id)
    assert forwarded_values.get("accept") == "*/*"


async def test_proxy_app_returns_not_modified_from_upstream(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Return a cached-response status code when the app replies not modified."""

    # Arrange
    user = users[0]
    local_location = await db.locations.create(
        "local", "Local testing", user, Country.CH
    )
    remote_location = await db.locations.create(
        "remote", "Remote testing", user, Country.CH
    )
    organization = await db.organizations.create("acme", remote_location.id, user)
    app = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/xlonglink/sample:latest",
        user=user,
    )
    await db.applications.set_status(app.id, ApplicationStatus.running)
    await db.compute.create(
        kind=ComputeKind.kubernetes,
        name="local",
        kubeconfig=(
            "apiVersion: v1\n"
            "clusters:\n"
            "- name: k3d-compute\n"
            "  cluster:\n"
            "    server: https://0.0.0.0:8001\n"
            "contexts:\n"
            "- name: k3d-compute\n"
            "  context:\n"
            "    cluster: k3d-compute\n"
            "    user: admin@k3d-compute\n"
            "current-context: k3d-compute\n"
            "kind: Config\n"
            "preferences: {}\n"
            "users:\n"
            "- name: admin@k3d-compute\n"
            "  user:\n"
            "    client-certificate-data: Y2VydA==\n"
            "    client-key-data: a2V5\n"
        ),
        ingress_host="localhost:9443",
        location_id=remote_location.id,
        user=user,
    )
    client = clients[0]

    class FakeCompute:
        def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
            pass

        def proxy(
            self,
            organization: str,
            application: str,
            path: str,
            method: str,
            query_params,
            headers,
            body,
        ):
            exception = ApiException(status=304, reason="Not Modified")
            exception.headers = {"Etag": '"etag-123"', "set-cookie": "tenant=owned"}
            raise exception

    monkeypatch.setattr("src.routes.applications.K8s", FakeCompute)

    # Act
    response = client.get(f"/api/applications/{app.id}/proxy/i18n/en.json")

    # Assert
    assert response.status_code == 304
    assert response.text == ""
    assert response.headers["etag"] == '"etag-123"'
    assert "set-cookie" not in response.headers


async def test_proxy_app_returns_upstream_error_body(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Propagate non-cache-related upstream exceptions to the caller."""

    # Arrange
    user = users[0]
    location = await db.locations.create("local", "Local testing", user, Country.CH)
    organization = await db.organizations.create("acme", location.id, user)
    app = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/xlonglink/sample:latest",
        user=user,
    )
    await db.applications.set_status(app.id, ApplicationStatus.running)
    await db.compute.create(
        kind=ComputeKind.kubernetes,
        name="local",
        kubeconfig=(
            "apiVersion: v1\n"
            "clusters:\n"
            "- name: k3d-compute\n"
            "  cluster:\n"
            "    server: https://0.0.0.0:8001\n"
            "contexts:\n"
            "- name: k3d-compute\n"
            "  context:\n"
            "    cluster: k3d-compute\n"
            "    user: admin@k3d-compute\n"
            "current-context: k3d-compute\n"
            "kind: Config\n"
            "preferences: {}\n"
            "users:\n"
            "- name: admin@k3d-compute\n"
            "  user:\n"
            "    client-certificate-data: Y2VydA==\n"
            "    client-key-data: a2V5\n"
        ),
        ingress_host="localhost:9443",
        location_id=location.id,
        user=user,
    )
    client = clients[0]

    class FakeCompute:
        def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
            pass

        def proxy(
            self,
            organization: str,
            application: str,
            path: str,
            method: str,
            query_params,
            headers,
            body,
        ):
            exception = ApiException(status=500, reason="Internal Server Error")
            exception.body = "backend-failed"
            exception.headers = {"Etag": '"etag-500"', "set-cookie": "tenant=owned"}
            raise exception

    monkeypatch.setattr("src.routes.applications.K8s", FakeCompute)

    # Act
    response = client.get(f"/api/applications/{app.id}/proxy/i18n/en.json")

    # Assert
    assert response.status_code == 500
    assert response.text == "backend-failed"
    assert response.headers["etag"] == '"etag-500"'
    assert "set-cookie" not in response.headers


async def test_organization_access_rejects_soft_deleted_membership(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject organization access when only a soft-deleted membership remains."""

    # Arrange
    owner = users[0]
    user = users[1]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=owner,
    )

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=user.id,
                organization_id=organization.id,
                role_name=OrganizationRoles.read,
                deleted_at=datetime.now(UTC),
            )
        )
        await session.commit()

    client = clients[1]

    # Act
    response = client.get(f"/api/organizations/{organization.id}/applications")

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": f"Organization '{organization.id}' not found"}


async def test_proxy_app_shows_loading_when_app_is_not_ready(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return a loading page while the application is still provisioning."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    app = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=owner,
    )
    client = clients[0]

    # Act
    response = client.get(f"/api/applications/{app.id}/proxy/metadata.json")

    # Assert
    assert response.status_code == 503
    assert response.text == ""
    assert response.headers["content-length"] == "0"
    assert response.headers["cache-control"] == "no-store"
