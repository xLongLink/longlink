import httpx2
from types import SimpleNamespace
from src.models.roles import Roles
from src.models.applications import AppResponse
from src.models.kinds import ComputeKind, DatabaseKind
from src.models.users import UserSummary
from fastapi.testclient import TestClient
from src.database.session import get_session
from src.database.models.users import User
from src.database.services.users import users
from src.database.services.compute import compute
from src.database.services.storage import storage
from src.database.services.database import database
from src.database.models.association import UserApp
from src.database.services.locations import locations
from src.database.services.operations import operations
from src.database.services.applications import apps
from src.database.services.organizations import orgs

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
    user = users[0]
    location = await db.locations.create("local", "Local testing")
    await db.orgs.create("acme", location.id, user)
    app = await db.apps.create(
        "acme",
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserApp(
                user_id=user.id,
                organization_name="acme",
                app_name="dashboard",
                role_name=Roles.write,
            )
        )
        await session.commit()

    client = clients[0]

    # Act
    response = client.get("/api/apps?organization=acme")

    # Assert
    assert response.status_code == 200
    expected_data = AppResponse.model_validate(
        {
            **app.model_dump(),
            "role": Roles.write,
            "created_by": UserSummary.model_validate(user.model_dump()),
            "updated_by": UserSummary.model_validate(user.model_dump()),
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
    location = await db.locations.create("local", "Local testing")
    await db.orgs.create("acme", location.id, user)
    app = await db.apps.create(
        "acme",
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )
    client = clients[0]

    # Act
    response = client.get("/api/apps?organization=acme")

    # Assert
    assert response.status_code == 200
    expected_data = AppResponse.model_validate(
        {
            **app.model_dump(),
            "role": None,
            "created_by": UserSummary.model_validate(user.model_dump()),
            "updated_by": UserSummary.model_validate(user.model_dump()),
            "deleted_by": None,
        }
    ).model_dump(mode="json")
    assert response.json() == [expected_data]


async def test_list_apps_returns_404_for_non_member(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject app listing when the user does not belong to the organization."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing")
    await db.orgs.create("acme", location.id, owner)
    await db.apps.create("acme", "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest")
    client = clients[1]

    # Act
    response = client.get("/api/apps?organization=acme")

    # Assert
    assert response.status_code == 404
    assert response.json() == {
        "success": False,
        "detail": "Org 'acme' not found",
        "data": None,
    }


async def test_create_app_returns_app_response(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Create an app and return the app response payload."""

    # Arrange
    user = users[0]
    local_location = await db.locations.create("local", "Local testing")
    remote_location = await db.locations.create("remote", "Remote testing")
    await db.orgs.create("acme", remote_location.id, user)
    await db.compute.create(
        kind=ComputeKind.kubernetes,
        kubeconfig="apiVersion: v1\nclusters: []\n",
        ingress_host="apps.local.longlink.internal",
        location_id=local_location.id,
    )
    await db.compute.create(
        kind=ComputeKind.kubernetes,
        kubeconfig="apiVersion: v1\nclusters: []\n",
        ingress_host="apps.remote.longlink.internal",
        location_id=remote_location.id,
    )
    await db.database.create(
        kind=DatabaseKind.postgre,
        name="local",
        host="db.local.longlink.internal",
        port=5432,
        username="longlink",
        password="secret",
        sslmode="require",
        maintenance_database="postgres",
        location_id=local_location.id,
    )
    await db.database.create(
        kind=DatabaseKind.postgre,
        name="remote",
        host="db.remote.longlink.internal",
        port=5432,
        username="longlink",
        password="secret",
        sslmode="require",
        maintenance_database="postgres",
        location_id=remote_location.id,
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
            sslmode: str | None,
            maintenance_database: str,
        ) -> None:
            captured["database"] = {
                "host": host,
                "port": port,
                "username": username,
                "password": password,
                "sslmode": sslmode,
            }
            captured["maintenance_database"] = maintenance_database

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
        "/api/apps?organization=acme",
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
    assert payload["description"] == "Dashboard app"
    assert payload["deleted_by"] is None
    assert payload == expected_data
    assert captured["namespace"] == "acme"
    assert captured["proxy_secret"]
    assert captured["database"] == {
        "host": "db.remote.longlink.internal",
        "port": 5432,
        "username": "longlink",
        "password": "secret",
        "sslmode": "require",
    }
    assert captured["schema"] == {"organization": "acme", "application": "dashboard"}
    assert captured["maintenance_database"] == "postgres"
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
    monkeypatch,
) -> None:
    """Delete an app even when it still has env secrets."""

    # Arrange
    user = users[0]
    local_location = await db.locations.create("local", "Local testing")
    remote_location = await db.locations.create("remote", "Remote testing")
    await db.orgs.create("acme", local_location.id, user)
    app = await db.apps.create("acme", "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest")
    captured: dict[str, object] = {}

    class FakeCompute:
        """Fake compute adapter for app deletion tests."""

        def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
            captured["proxy_secret"] = proxy_secret

        async def remove(self, organization: str, application: str) -> None:
            captured["remove"] = {"organization": organization, "application": application}

    monkeypatch.setattr("src.routes.applications.K8s", FakeCompute)
    await db.compute.create(
        kind=ComputeKind.kubernetes,
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
    )
    await db.compute.create(
        kind=ComputeKind.kubernetes,
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
    )
    client = clients[0]

    # Act
    response = client.delete(f"/api/apps/{app.id}?organization=acme")

    # Assert
    assert response.status_code == 204
    assert await db.apps.get("acme", "dashboard") is None
    assert captured == {
        "proxy_secret": captured["proxy_secret"],
        "remove": {"organization": "acme", "application": "dashboard"},
    }


async def test_get_app_logs_returns_pod_logs(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Return the recent pod logs for one app."""

    # Arrange
    user = users[0]
    location = await db.locations.create("local", "Local testing")
    await db.orgs.create("acme", location.id, user)
    app = await db.apps.create("acme", "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest")
    await db.compute.create(
        kind=ComputeKind.kubernetes,
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
    response = client.get(f"/api/apps/{app.id}/logs?organization=acme")

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
    local_location = await db.locations.create("local", "Local testing")
    remote_location = await db.locations.create("remote", "Remote testing")
    await db.orgs.create("acme", remote_location.id, user)
    app = await db.apps.create("acme", "dashboard", slug="dashboard", image="ghcr.io/xlonglink/sample:latest")
    await db.compute.create(
        kind=ComputeKind.kubernetes,
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
    )
    await db.compute.create(
        kind=ComputeKind.kubernetes,
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
    )
    await db.compute.create(
        kind=ComputeKind.kubernetes,
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
        proxy_secret="latest-secret",
    )
    client = clients[0]
    captured: dict[str, object] = {}

    class FakeAsyncClient:
        def __init__(self, *, verify=True):
            captured["verify"] = verify

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def request(self, method, url, **kwargs):
            captured["method"] = method
            captured["resource_path"] = url
            captured["query_params"] = kwargs.get("params")
            captured["headers"] = kwargs.get("headers")
            captured["body"] = kwargs.get("content")
            return httpx2.Response(200, content=b"proxied", headers={"content-type": "text/plain"})

    monkeypatch.setattr(httpx2, "AsyncClient", FakeAsyncClient)

    # Act
    response = client.post(f"/api/apps/{app.id}/proxy/anything?answer=42", content=b"hello")

    # Assert
    assert response.status_code == 200
    assert response.text == "proxied"
    assert captured["method"] == "POST"
    assert captured["resource_path"] == "http://localhost:9443/longlink-acme/dashboard/anything"
    assert captured["query_params"] == [("answer", "42")]
    assert captured["body"] == b"hello"
    assert captured["headers"]["apikey"] == "latest-secret"
    assert captured["verify"] is False
