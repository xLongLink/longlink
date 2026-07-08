import pytest
from types import SimpleNamespace
from datetime import UTC, datetime
from tenant.models import User as TenantUser
from src.operations import provisioning
from src.models.roles import ApplicationRoles, OrganizationRoles
from fastapi.testclient import TestClient
from src.models.computes import ComputeKind
from src.models.metadata import LongLinkMetadata, EnvironmentMetadata
from src.models.storages import StorageKind
from src.database.session import get_session
from src.models.databases import DatabaseKind
from src.database.services import users, compute, storage, database, locations, operations, applications, organizations
from src.models.operations import OperationKind
from src.models.applications import ApplicationStatus
from src.database.models.users import User
from src.database.models.association import UserApplication, UserOrganization

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
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)
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
    location = await db.locations.create("local", "Local testing", user, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, user)
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
    location = await db.locations.create("local", "Local testing", user, "CH")
    acme = await db.organizations.create("acme", "acme", location.id, user)
    globex = await db.organizations.create("globex", "globex", location.id, user)
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
    assert {item["id"] for item in response.json()} == {
        str(dashboard.id),
        str(console.id),
    }


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
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)
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
    local_location = await db.locations.create("local", "Local testing", user, "CH")
    remote_location = await db.locations.create("remote", "Remote testing", user, "CH")
    organization = await db.organizations.create("acme", "acme", remote_location.id, user)
    await db.compute.create(
        kind=ComputeKind.kubernetes,
        name="local",
        slug="local",
        kubeconfig="apiVersion: v1\nclusters: []\n",
        ingress_host="apps.local.longlink.internal",
        location_id=local_location.id,
        user=user,
    )
    await db.compute.create(
        kind=ComputeKind.kubernetes,
        name="remote",
        slug="remote",
        kubeconfig="apiVersion: v1\nclusters: []\n",
        ingress_host="apps.remote.longlink.internal",
        location_id=remote_location.id,
        user=user,
    )
    await db.database.create(
        kind=DatabaseKind.postgresql,
        name="local",
        slug="local",
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
        slug="remote",
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
        slug="remote",
        protocol="http",
        endpoint_url="http://storage.control.longlink.internal",
        runtime_endpoint_url="http://storage.runtime.longlink.internal:19000",
        access_key_id="storage-access",
        secret_access_key="storage-secret",
        location_id=remote_location.id,
        user=user,
    )

    async def fake_metadata(image: str) -> LongLinkMetadata:
        image_metadata = LongLinkMetadata(
            version="20250623_120000",
            sdk="0.1.0",
            digest="sha256:manifest",
        )
        image_metadata.image = "ghcr.io/longlink/dashboard@sha256:manifest"
        return image_metadata

    monkeypatch.setattr("src.operations.provisioning.images.metadata", fake_metadata)

    captured: dict[str, object] = {}
    captured_buckets: list[tuple[str, ...]] = []

    class FakeCompute:
        """Fake compute adapter for app creation tests."""

        def __init__(self, kubeconfig: str, proxy_secret: str, ingress_host: str) -> None:
            captured["kubeconfig"] = kubeconfig
            captured["proxy_secret"] = proxy_secret
            captured["ingress_host"] = ingress_host

        async def namespace(self, organization: str) -> None:
            captured["namespace"] = organization

        async def application(
            self,
            organization: str,
            application: str,
            application_id: str,
            image: str,
            port: int,
            secrets: dict[str, str],
            rollout_token: str = "",
        ) -> None:
            captured["application"] = {
                "organization": organization,
                "application": application,
                "application_id": application_id,
                "image": image,
                "port": port,
                "secrets": secrets,
                "rollout_token": rollout_token,
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

        async def sync_users(self, organization: str, users: list[TenantUser]) -> None:
            captured["sync_users"] = {
                "organization": organization,
                "users": users,
            }

    class FakeStorage:
        """Fake storage adapter for app creation tests."""

        def __init__(
            self,
            protocol: str,
            endpoint_url: str,
            access_key_id: str,
            secret_access_key: str,
        ) -> None:
            captured["storage"] = {
                "protocol": protocol,
                "endpoint_url": endpoint_url,
                "access_key_id": access_key_id,
                "secret_access_key": secret_access_key,
            }

        async def bucket(self, bucket_name: str) -> str:
            captured_buckets.append(("bucket", bucket_name))
            return bucket_name

        async def application_credentials(
            self,
            application_bucket: str,
            shared_bucket: str,
            other_application_buckets: list[str],
        ) -> dict[str, str]:
            captured["storage_credentials"] = {
                "application_bucket": application_bucket,
                "shared_bucket": shared_bucket,
                "other_application_buckets": other_application_buckets,
            }
            return {"access_key_id": "app-access", "secret_access_key": "app-secret"}

    monkeypatch.setattr(
        "src.operations.provisioning.compute_runtime.kubernetes",
        lambda registry: FakeCompute(registry.kubeconfig, registry.proxy_secret, registry.ingress_host),
    )
    monkeypatch.setattr(
        "src.operations.provisioning.adapters.database",
        lambda registry: FakeDatabase(
            registry.host,
            registry.port,
            registry.username,
            registry.password,
            runtime_host=registry.runtime_host,
            runtime_port=registry.runtime_port,
        ),
    )
    monkeypatch.setattr(
        "src.operations.provisioning.adapters.storage",
        lambda registry: FakeStorage(
            registry.protocol,
            registry.endpoint_url,
            registry.access_key_id,
            registry.secret_access_key,
        ),
    )
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
    assert payload["sdk"] == "0.1.0"
    assert payload["digest"] == "sha256:manifest"
    assert payload["gateway_url"] == f"https://apps.remote.longlink.internal/api/applications/{payload['id']}/proxy/"
    assert captured["namespace"] == "acme"
    assert captured["proxy_secret"]
    assert captured["ingress_host"] == "apps.remote.longlink.internal"
    assert captured["schema"] == {"organization": "acme", "application": "dashboard"}
    assert captured_buckets == [
        ("bucket", "longlink-acme-shared"),
        ("bucket", "longlink-acme-dashboard"),
    ]
    assert captured["storage_credentials"] == {
        "application_bucket": "longlink-acme-dashboard",
        "shared_bucket": "longlink-acme-shared",
        "other_application_buckets": [],
    }
    sync_payload = captured["sync_users"]
    assert isinstance(sync_payload, dict)
    synced_users = sync_payload["users"]
    assert isinstance(synced_users, list)
    assert all(isinstance(synced_user, TenantUser) for synced_user in synced_users)
    assert sync_payload["organization"] == "acme"
    assert synced_users[0].email == user.email
    application_payload = captured["application"]
    assert isinstance(application_payload, dict)
    assert application_payload["organization"] == "acme"
    assert application_payload["application"] == "dashboard"
    assert application_payload["application_id"] == payload["id"]
    assert application_payload["image"] == "ghcr.io/longlink/dashboard@sha256:manifest"
    application_secrets = application_payload["secrets"]
    assert isinstance(application_secrets, dict)
    assert application_secrets["API_KEY"] == "secret-value"
    assert application_secrets["LONGLINK_ENV"] == "production"
    assert application_secrets["LONGLINK_DATABASE_URL"] == "postgresql+asyncpg://fake"
    assert application_secrets["LONGLINK_STORAGE_BUCKET"] == "longlink-acme-dashboard"
    assert application_secrets["LONGLINK_STORAGE_SHARED_BUCKET"] == "longlink-acme-shared"
    assert application_secrets["LONGLINK_STORAGE_URL"].startswith("s3+http://app-access:app-secret@")
    assert "LONGLINK_INTERNAL" not in application_secrets


async def test_organization_storage_registry_reuses_existing_app_registry(
    users: tuple[User, User, User],
) -> None:
    """Keep organization storage on the first registry already used by its apps."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)
    primary = await db.storage.create(
        kind=StorageKind.s3,
        name="primary",
        slug="primary",
        protocol="http",
        endpoint_url="http://storage-primary.local",
        access_key_id="primary-access",
        secret_access_key="primary-secret",
        location_id=location.id,
        user=owner,
    )
    await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        storage_registry_id=primary.id,
        user=owner,
    )
    await db.storage.create(
        kind=StorageKind.s3,
        name="secondary",
        slug="secondary",
        protocol="http",
        endpoint_url="http://storage-secondary.local",
        access_key_id="secondary-access",
        secret_access_key="secondary-secret",
        location_id=location.id,
        user=owner,
    )

    # Act
    selected = await provisioning.organization_storage_registry(organization)

    # Assert
    assert selected is not None
    assert selected.id == primary.id


async def test_create_app_returns_409_when_image_metadata_is_missing(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Reject app creation when the image cannot be inspected."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)

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
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)
    await db.compute.create(
        kind=ComputeKind.kubernetes,
        name="local",
        slug="local",
        kubeconfig="apiVersion: v1\nclusters: []\n",
        ingress_host="apps.local.longlink.internal",
        location_id=location.id,
        user=owner,
    )
    await db.database.create(
        kind=DatabaseKind.postgresql,
        name="primary",
        slug="primary",
        host="db.local.longlink.internal",
        port=5432,
        username="longlink",
        password="secret",
        location_id=location.id,
        user=owner,
    )

    async def fake_metadata(image: str) -> LongLinkMetadata:
        """Return metadata for an app that needs platform-managed storage."""

        image_metadata = LongLinkMetadata(
            version="20250623_120000",
            sdk="0.1.0",
            digest="sha256:manifest",
            environments=[
                EnvironmentMetadata(name="LONGLINK_STORAGE_URL", type="str", required=True),
            ],
        )
        image_metadata.image = "ghcr.io/longlink/dashboard@sha256:manifest"
        return image_metadata

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
    assert response.json() == {"detail": expected_detail}
    assert await db.applications.list_by_organization(organization.id) == []


async def test_create_app_returns_409_for_overlong_runtime_bucket_name(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject app creation when combined runtime resource names exceed backend limits."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)
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
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)

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

    monkeypatch.setattr(
        "src.routes.applications.provisioning.create_application_runtime",
        fail_create_application_runtime,
    )
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
    location = await db.locations.create("local", "Local testing", user, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, user)
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
        slug="local",
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

        def __init__(self, kubeconfig: str, proxy_secret: str, ingress_host: str) -> None:
            captured["kubeconfig"] = kubeconfig
            captured["proxy_secret"] = proxy_secret
            captured["ingress_host"] = ingress_host

        async def logs(self, organization: str, application: str, lines: int = 200) -> str:
            captured["logs"] = {
                "organization": organization,
                "application": application,
                "lines": lines,
            }
            return "line 1\nline 2"

    monkeypatch.setattr(
        "src.routes.applications.compute_runtime.kubernetes",
        lambda registry: FakeCompute(registry.kubeconfig, registry.proxy_secret, registry.ingress_host),
    )
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
    location = await db.locations.create("local", "Local testing", user, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, user)
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
    recorded_operations = await db.operations.fetch_all()
    assert len(recorded_operations) == 1
    assert recorded_operations[0].kind == OperationKind.application_delete
    assert recorded_operations[0].step == "remove"
    assert recorded_operations[0].application_id == app.id
    assert recorded_operations[0].scheduled_at is not None


async def test_gateway_authz_allows_application_request(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Authorize a gateway request and return trusted runtime headers."""

    # Arrange
    user = users[0]
    local_location = await db.locations.create("local", "Local testing", user, "CH")
    remote_location = await db.locations.create("remote", "Remote testing", user, "CH")
    organization = await db.organizations.create("acme", "acme", remote_location.id, user)
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
        slug="local",
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
    registry = await db.compute.create(
        kind=ComputeKind.kubernetes,
        name="remote",
        slug="remote",
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
        slug="remote-extra",
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
    await db.applications.update_runtime(
        app.id,
        image=app.image,
        compute_registry_id=registry.id,
        status=ApplicationStatus.running,
        user=user,
    )
    client = clients[0]

    # Act
    response = client.post(
        "/api/gateway/authz",
        headers={
            "x-longlink-gateway-secret": registry.proxy_secret,
            "x-longlink-original-method": "POST",
            "x-longlink-original-path": f"/api/applications/{app.id}/proxy/anything?answer=42",
        },
    )

    # Assert
    assert response.status_code == 200
    assert response.headers["x-user-id"] == str(user.id)
    assert response.headers["x-user-role"] == "owner"
    assert response.headers["x-longlink-application-id"] == str(app.id)
    assert response.headers["x-longlink-application-slug"] == "dashboard"
    assert response.headers["x-longlink-organization-id"] == str(organization.id)
    assert response.headers["x-longlink-organization-slug"] == "acme"


async def test_gateway_authz_requires_application_role_for_regular_member(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject app proxy access for regular org members without an app role."""

    # Arrange
    owner = users[0]
    user = users[1]
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)
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

    registry = await db.compute.create(
        kind=ComputeKind.kubernetes,
        name="local",
        slug="local",
        kubeconfig="apiVersion: v1\nclusters: []\n",
        ingress_host="localhost:9443",
        location_id=location.id,
        user=owner,
    )
    await db.applications.update_runtime(
        app.id,
        image=app.image,
        compute_registry_id=registry.id,
        status=ApplicationStatus.running,
        user=owner,
    )
    client = clients[1]

    # Act
    response = client.get(
        "/api/gateway/authz",
        headers={
            "x-longlink-gateway-secret": registry.proxy_secret,
            "x-longlink-original-method": "GET",
            "x-longlink-original-path": f"/api/applications/{app.id}/proxy/metadata.json",
        },
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Application access required"}


async def test_gateway_authz_requires_compute_secret(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject gateway authorization requests without the compute proxy secret."""

    # Arrange
    user = users[0]
    local_location = await db.locations.create("local", "Local testing", user, "CH")
    remote_location = await db.locations.create("remote", "Remote testing", user, "CH")
    organization = await db.organizations.create("acme", "acme", remote_location.id, user)
    app = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/xlonglink/sample:latest",
        user=user,
    )
    await db.applications.set_status(app.id, ApplicationStatus.running)
    registry = await db.compute.create(
        kind=ComputeKind.kubernetes,
        name="local",
        slug="local",
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
    await db.applications.update_runtime(
        app.id,
        image=app.image,
        compute_registry_id=registry.id,
        status=ApplicationStatus.running,
        user=user,
    )
    client = clients[0]

    # Act
    response = client.get(
        "/api/gateway/authz",
        headers={
            "x-longlink-gateway-secret": "wrong",
            "x-longlink-original-method": "GET",
            "x-longlink-original-path": f"/api/applications/{app.id}/proxy/i18n/en.json",
        },
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Gateway authorization required"}


async def test_gateway_authz_enforces_method_role(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject mutating gateway requests when the runtime role is read-only."""

    # Arrange
    user = users[0]
    local_location = await db.locations.create("local", "Local testing", user, "CH")
    remote_location = await db.locations.create("remote", "Remote testing", user, "CH")
    organization = await db.organizations.create("acme", "acme", remote_location.id, user)
    app = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/xlonglink/sample:latest",
        user=user,
    )
    await db.applications.set_status(app.id, ApplicationStatus.running)
    registry = await db.compute.create(
        kind=ComputeKind.kubernetes,
        name="local",
        slug="local",
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
    await db.applications.update_runtime(
        app.id,
        image=app.image,
        compute_registry_id=registry.id,
        status=ApplicationStatus.running,
        user=user,
    )
    Session = await get_session()
    async with Session() as session:
        organization_membership = await session.get(UserOrganization, (user.id, organization.id))
        assert organization_membership is not None
        organization_membership.role_name = OrganizationRoles.read
        application_membership = await session.get(
            UserApplication,
            {
                "user_id": user.id,
                "organization_id": organization.id,
                "application_id": app.id,
            },
        )
        assert application_membership is not None
        application_membership.role_name = ApplicationRoles.read
        await session.commit()

    client = clients[0]

    # Act
    response = client.post(
        "/api/gateway/authz",
        headers={
            "x-longlink-gateway-secret": registry.proxy_secret,
            "x-longlink-original-method": "POST",
            "x-longlink-original-path": f"/api/applications/{app.id}/proxy/api/tasks",
        },
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Application write access required"}


async def test_gateway_authz_rejects_other_compute_app(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject gateway requests for applications not assigned to that compute."""

    # Arrange
    user = users[0]
    location = await db.locations.create("local", "Local testing", user, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, user)
    app = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/xlonglink/sample:latest",
        user=user,
    )
    await db.applications.set_status(app.id, ApplicationStatus.running)
    registry = await db.compute.create(
        kind=ComputeKind.kubernetes,
        name="local",
        slug="local",
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

    # Act
    response = client.get(
        "/api/gateway/authz",
        headers={
            "x-longlink-gateway-secret": registry.proxy_secret,
            "x-longlink-original-method": "GET",
            "x-longlink-original-path": f"/api/applications/{app.id}/proxy/i18n/en.json",
        },
    )

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": f"Application '{app.id}' not found"}


async def test_organization_access_rejects_soft_deleted_membership(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject organization access when only a soft-deleted membership remains."""

    # Arrange
    owner = users[0]
    user = users[1]
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)
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


async def test_gateway_authz_shows_loading_when_app_is_not_ready(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return a loading page while the application is still provisioning."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)
    app = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=owner,
    )
    registry = await db.compute.create(
        kind=ComputeKind.kubernetes,
        name="local",
        slug="local",
        kubeconfig="apiVersion: v1\nclusters: []\n",
        ingress_host="localhost:9443",
        location_id=location.id,
        user=owner,
    )
    await db.applications.update_runtime(
        app.id,
        image=app.image,
        compute_registry_id=registry.id,
        user=owner,
    )
    client = clients[0]

    # Act
    response = client.get(
        "/api/gateway/authz",
        headers={
            "x-longlink-gateway-secret": registry.proxy_secret,
            "x-longlink-original-method": "GET",
            "x-longlink-original-path": f"/api/applications/{app.id}/proxy/metadata.json",
        },
    )

    # Assert
    assert response.status_code == 503
    assert response.text == ""
    assert response.headers["content-length"] == "0"
    assert response.headers["cache-control"] == "no-store"
