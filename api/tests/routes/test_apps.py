import pytest
from types import SimpleNamespace
from src.models.roles import ApplicationRoles, OrganizationRoles
from src.models.users import UserSummary
from fastapi.testclient import TestClient
from src.models.compute import ComputeKind
from src.models.database import DatabaseKind
from src.models.metadata import LongLinkMetadata
from src.database.session import get_session
from src.models.countries import Country
from src.models.operations import OperationKind
from src.models.applications import ApplicationResponse as AppResponse
from src.database.models.users import User
from src.database.services.users import users
from src.database.services.compute import compute
from src.database.services.storage import storage
from src.database.services.database import database
from src.database.models.association import UserApplication as UserApp
from src.database.models.association import UserOrganization
from src.database.services.locations import locations
from src.database.services.operations import operations
from src.database.services.applications import applications as apps
from src.database.services.organizations import organizations as orgs

db = SimpleNamespace(
    apps=apps,
    compute=compute,
    database=database,
    locations=locations,
    operations=operations,
    orgs=orgs,
    storage=storage,
    users=users,
)


async def test_list_apps_returns_app_membership_role(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return the app-specific role instead of the organization role."""

    # Arrange
    owner = users[0]
    user = users[1]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.orgs.create("acme", location.id, owner)
    app = await db.apps.create(
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
            UserApp(
                user_id=user.id,
                organization_id=organization.id,
                application_id=app.id,
                role_name=ApplicationRoles.write,
            )
        )
        await session.commit()

    client = clients[1]

    # Act
    response = client.get(f"/api/applications?organization_id={organization.id}")

    # Assert
    assert response.status_code == 200
    expected_data = AppResponse.model_validate(
        {
            **app.model_dump(),
            "organization": app.organization,
            "role": ApplicationRoles.write,
            "created_by": UserSummary.model_validate(owner.model_dump()),
            "updated_by": UserSummary.model_validate(owner.model_dump()),
            "deleted_by": None,
        }
    ).model_dump(mode="json")
    assert response.json() == [expected_data]


async def test_list_apps_returns_null_role_without_app_membership(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return no app role when the user has no app membership row."""

    # Arrange
    user = users[0]
    location = await db.locations.create("local", "Local testing", user, Country.CH)
    organization = await db.orgs.create("acme", location.id, user)
    app = await db.apps.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )
    client = clients[0]

    # Act
    response = client.get(f"/api/applications?organization_id={organization.id}")

    # Assert
    assert response.status_code == 200
    expected_data = AppResponse.model_validate(
        {
            **app.model_dump(),
            "organization": app.organization,
            "role": None,
            "created_by": UserSummary.model_validate(user.model_dump()),
            "updated_by": UserSummary.model_validate(user.model_dump()),
            "deleted_by": None,
        }
    ).model_dump(mode="json")
    assert response.json() == [expected_data]


async def test_list_apps_without_organization_returns_all_apps_for_admin(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return all apps when an admin does not filter by organization."""

    # Arrange
    user = users[0]
    location = await db.locations.create("local", "Local testing", user, Country.CH)
    acme = await db.orgs.create("acme", location.id, user)
    globex = await db.orgs.create("globex", location.id, user)
    dashboard = await db.apps.create(
        acme.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )
    console = await db.apps.create(
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
    expected_data = [
        AppResponse.model_validate(
            {
                **dashboard.model_dump(),
                "organization": dashboard.organization,
                "role": None,
                "created_by": UserSummary.model_validate(user.model_dump()),
                "updated_by": UserSummary.model_validate(user.model_dump()),
                "deleted_by": None,
            }
        ).model_dump(mode="json"),
        AppResponse.model_validate(
            {
                **console.model_dump(),
                "organization": console.organization,
                "role": None,
                "created_by": UserSummary.model_validate(user.model_dump()),
                "updated_by": UserSummary.model_validate(user.model_dump()),
                "deleted_by": None,
            }
        ).model_dump(mode="json"),
    ]
    assert response.json() == expected_data


async def test_list_apps_without_organization_requires_admin(
    clients: tuple[TestClient, TestClient, TestClient],
) -> None:
    """Reject all-app listing for non-admin users."""

    # Arrange
    client = clients[1]

    # Act
    response = client.get("/api/applications")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Administrator privileges required"}


async def test_list_apps_returns_404_for_non_member(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject app listing when the user does not belong to the organization."""

    # Arrange
    owner = users[0]
    user = users[1]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.orgs.create("acme", location.id, owner)
    await db.apps.create(organization.id, "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest", user=owner)
    client = clients[1]

    # Act
    response = client.get(f"/api/applications?organization_id={organization.id}")

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
    local_location = await db.locations.create("local", "Local testing", user, Country.CH)
    remote_location = await db.locations.create("remote", "Remote testing", user, Country.CH)
    organization = await db.orgs.create("acme", remote_location.id, user)
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
        location_id=remote_location.id,
        user=user,
    )

    monkeypatch.setattr(
        "src.routes.applications.metadata",
        lambda image: LongLinkMetadata(version="20250623_120000", sdk="0.1.0"),
    )

    captured: dict[str, object] = {}

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
        ) -> None:
            captured["database"] = {
                "host": host,
                "port": port,
                "username": username,
                "password": password,
            }

        async def schema(self, organization: str, application: str) -> str:
            captured["schema"] = {
                "organization": organization,
                "application": application,
            }
            return "postgresql://fake"

    monkeypatch.setattr("src.routes.applications.K8s", FakeCompute)
    monkeypatch.setattr("src.routes.applications.Postgre", FakeDatabase)
    client = clients[0]

    # Act
    response = client.post(
        f"/api/applications?organization_id={organization.id}",
        json={
            "name": "dashboard",
            "image": "ghcr.io/longlink/dashboard:latest",
            "description": "Dashboard app",
            "envs": {
                "API_KEY": "secret-value",
                "PORT": "8080",
            },
        },
    )

    # Assert
    assert response.status_code == 200
    payload = response.json()
    expected_data = AppResponse.model_validate(payload).model_dump(mode="json")
    assert payload["status"] == "creating"
    assert payload["description"] == "Dashboard app"
    assert payload["version"] == "20250623_120000"
    assert payload["sdk_version"] == "0.1.0"
    assert payload["deleted_by"] is None
    assert payload == expected_data
    assert captured["namespace"] == "acme"
    assert captured["proxy_secret"]
    assert captured["database"] == {
        "host": "db.remote.longlink.internal",
        "port": 5432,
        "username": "longlink",
        "password": "secret",
    }
    assert captured["schema"] == {"organization": "acme", "application": "dashboard"}
    assert captured["application"] == {
        "organization": "acme",
        "application": "dashboard",
        "image": "ghcr.io/longlink/dashboard:latest",
        "port": 80,
        "secrets": {
            "API_KEY": "secret-value",
            "PORT": "8080",
        },
    }


async def test_delete_app_removes_dependent_env_rows(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Queue app deletion even when it still has env secrets."""

    # Arrange
    user = users[0]
    local_location = await db.locations.create("local", "Local testing", user, Country.CH)
    remote_location = await db.locations.create("remote", "Remote testing", user, Country.CH)
    organization = await db.orgs.create("acme", local_location.id, user)
    app = await db.apps.create(organization.id, "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest", user=user)
    await db.compute.create(
        kind=ComputeKind.kubernetes,
        name="primary",
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
        name="secondary",
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
    client = clients[0]

    # Act
    response = client.delete(f"/api/applications/{app.id}")

    # Assert
    assert response.status_code == 204
    refreshed_app = await db.apps.get(organization.id, "dashboard")
    assert refreshed_app is not None
    assert refreshed_app.status == "deleting"
    recorded_operation = (await db.operations.list())[0]
    assert recorded_operation.kind == OperationKind.app_delete
    assert recorded_operation.application_id == app.id
    assert recorded_operation.step == "remove_runtime"


async def test_get_app_logs_returns_pod_logs(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Return the recent pod logs for one app."""

    # Arrange
    user = users[0]
    location = await db.locations.create("local", "Local testing", user, Country.CH)
    organization = await db.orgs.create("acme", location.id, user)
    app = await db.apps.create(organization.id, "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest", user=user)
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

        async def logs(self, organization: str, application: str, lines: int = 200) -> str:
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
    assert captured["logs"] == {"organization": "acme", "application": "dashboard", "lines": 200}


async def test_proxy_app_forwards_request_to_internal_service(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Proxy an app request into the internal service."""

    # Arrange
    user = users[0]
    local_location = await db.locations.create("local", "Local testing", user, Country.CH)
    remote_location = await db.locations.create("remote", "Remote testing", user, Country.CH)
    organization = await db.orgs.create("acme", remote_location.id, user)
    app = await db.apps.create(organization.id, "dashboard", slug="dashboard", image="ghcr.io/xlonglink/sample:latest", user=user)
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

    class FakeApiClient:
        def call_api(self, resource_path, method, **kwargs):
            captured["method"] = method
            captured["resource_path"] = resource_path
            captured["query_params"] = kwargs.get("query_params")
            captured["headers"] = kwargs.get("header_params")
            captured["body"] = kwargs.get("body")
            captured["auth_settings"] = kwargs.get("auth_settings")
            return (
                type("Response", (), {"data": b"proxied"})(),
                200,
                {"content-type": "text/plain"},
            )

    class FakeCompute:
        def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
            captured["kubeconfig"] = kubeconfig
            captured["proxy_secret"] = proxy_secret
            self._api_client = FakeApiClient()

    monkeypatch.setattr("src.routes.proxy.K8s", FakeCompute)

    # Act
    response = client.post(f"/api/applications/{app.id}/proxy/anything?answer=42", content=b"hello")

    # Assert
    assert response.status_code == 200
    assert response.text == "proxied"
    assert captured["method"] == "POST"
    assert captured["resource_path"] == "/api/v1/namespaces/longlink-acme/services/dashboard/proxy/anything"
    assert captured["query_params"] == [("answer", "42")]
    assert captured["body"] == b"hello"
    assert captured["auth_settings"] == ["BearerToken"]


def test_proxy_app_rejects_root_path(clients: tuple[TestClient, TestClient, TestClient]) -> None:
    """Reject the root proxy path in production."""

    # Arrange
    client = clients[0]

    # Act
    response = client.get("/api/applications/00000000-0000-0000-0000-000000000001/proxy/")

    # Assert
    assert response.status_code == 404


@pytest.mark.parametrize("method", ["HEAD", "OPTIONS", "PUT"])
def test_proxy_app_rejects_unsupported_methods(clients: tuple[TestClient, TestClient, TestClient], method: str) -> None:
    """Reject proxy methods outside the explicit allowlist."""

    # Arrange
    client = clients[0]

    # Act
    response = client.request(method, "/api/applications/00000000-0000-0000-0000-000000000001/proxy")

    # Assert
    assert response.status_code == 405
