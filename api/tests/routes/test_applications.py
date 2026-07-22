import httpx2
from uuid import UUID
from types import SimpleNamespace
from factories import create_organization, mark_organization_running, create_ready_infrastructure
from src.environments import env
from src.models.roles import ApplicationRoles, OrganizationRoles
from fastapi.testclient import TestClient
from longlink.utils.time import utcnow
from src.models.statuses import ApplicationStatus
from src.database.session import get_session
from src.database.services import operations, applications, organizations
from src.models.operations import OperationStatus
from src.database.models.users import User
from src.database.models.association import UserApplication, UserOrganization


async def test_list_organization_apps_returns_app_membership_role(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return the application-specific role instead of the organization role."""

    # Arrange
    owner = users[0]
    user = users[1]
    infrastructure = await create_ready_infrastructure(owner)
    organization = await create_organization(infrastructure, owner)
    await mark_organization_running(organization)
    app = await applications.create(
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
                role=OrganizationRoles.read,
            )
        )
        session.add(
            UserApplication(
                user_id=user.id,
                organization_id=organization.id,
                application_id=app.id,
                role=ApplicationRoles.write,
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


async def test_list_apps_without_organization_returns_all_apps_for_admin(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return all applications when an admin does not filter by organization."""

    # Arrange
    user = users[0]
    infrastructure = await create_ready_infrastructure(user)
    acme = await create_organization(infrastructure, user)
    globex = await create_organization(infrastructure, user, name="globex", slug="globex")
    await mark_organization_running(acme)
    await mark_organization_running(globex)
    dashboard = await applications.create(
        acme.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )
    console = await applications.create(
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
    assert response.json() == {"detail": "Permission required"}


async def test_list_organization_apps_returns_403_for_non_member(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject application listing when the user does not belong to the organization."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure(owner)
    organization = await create_organization(infrastructure, owner)
    await mark_organization_running(organization)
    await applications.create(
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
    assert response.status_code == 403
    assert response.json() == {"detail": "Access required"}


async def test_create_app_persists_desired_state_and_queues_reconciliation(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Persist Application desired state and return its compute Operation."""

    # Arrange
    user = users[0]
    infrastructure = await create_ready_infrastructure(user)
    organization = await create_organization(infrastructure, user)
    await mark_organization_running(organization)
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
                "PORT": "8080",
            },
        },
    )

    # Assert
    assert response.status_code == 202
    payload = response.json()
    application = payload["application"]
    operation = payload["operation"]
    assert application["status"] == "creating"
    assert application["description"] == "Dashboard app"
    assert application["image"] == "ghcr.io/longlink/dashboard:latest"
    assert operation["compute_id"] == str(infrastructure.compute.id)
    assert operation["platform_version"] == env.VERSION
    assert operation["status"] == OperationStatus.scheduled

    persisted = await applications.get(UUID(application["id"]))
    assert persisted is not None
    assert persisted.organization_id == organization.id
    assert persisted.envs == {"API_KEY": "secret-value", "PORT": "8080"}
    queued = await operations.fetch()
    assert len(queued) == 1
    assert str(queued[0].id) == operation["id"]


async def test_create_app_returns_403_for_regular_member(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject application creation when the organization member lacks deployment permissions."""

    # Arrange
    owner = users[0]
    regular_member = users[1]
    infrastructure = await create_ready_infrastructure(owner)
    organization = await create_organization(infrastructure, owner)

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=regular_member.id,
                organization_id=organization.id,
                role=OrganizationRoles.write,
            )
        )
        await session.commit()

    client = clients[1]

    # Act
    response = client.post(
        f"/api/organizations/{organization.id}/applications",
        json={"name": "dashboard", "image": "ghcr.io/longlink/dashboard:latest"},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}


async def test_get_app_logs_returns_pod_logs(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Return recent pod logs through the Organization's compute cluster."""

    # Arrange
    user = users[0]
    infrastructure = await create_ready_infrastructure(user)
    organization = await create_organization(infrastructure, user)
    await mark_organization_running(organization)
    app = await applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )
    registry = infrastructure.compute
    captured: dict[str, object] = {}

    class FakeCompute:
        """Fake compute adapter for application log tests."""

        def __init__(self, kubeconfig: str) -> None:
            """Capture compute registry configuration."""

            self.applications = self
            captured["kubeconfig"] = kubeconfig

        async def logs(self, application_id: str, lines: int = 200) -> list[str]:
            """Record the log request and return fake pod logs."""

            captured["logs"] = {
                "application_id": application_id,
                "lines": lines,
            }
            return ["line 1", "line 2"]

    monkeypatch.setattr("src.routes.applications.Kubernetes", FakeCompute)
    client = clients[0]

    # Act
    response = client.get(f"/api/applications/{app.id}/logs")

    # Assert
    assert response.status_code == 200
    assert response.json() == ["line 1", "line 2"]
    assert captured["kubeconfig"] == registry.kubeconfig
    assert captured["logs"] == {
        "application_id": str(app.id),
        "lines": 200,
    }


async def test_delete_application_soft_deletes_and_returns_reconciliation_operation(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Soft-delete an Application and return its compute Operation."""

    # Arrange
    user = users[0]
    infrastructure = await create_ready_infrastructure(user)
    organization = await create_organization(infrastructure, user)
    await mark_organization_running(organization)
    app = await applications.create(
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
    assert response.status_code == 202
    payload = response.json()
    assert payload["application"]["id"] == str(app.id)
    assert payload["application"]["status"] == "deleting"
    assert payload["operation"]["compute_id"] == str(infrastructure.compute.id)
    assert payload["operation"]["platform_version"] == env.VERSION
    assert payload["operation"]["status"] == OperationStatus.scheduled
    assert await applications.get(app.id) is None
    deleted = await applications.get(app.id, include_deleted=True)
    assert deleted is not None
    assert deleted.deleted_id == user.id
    recorded_operations = await operations.fetch()
    assert len(recorded_operations) == 1
    assert str(recorded_operations[0].id) == payload["operation"]["id"]


async def test_application_proxy_forwards_safe_content_and_rejects_active_content(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Forward an authenticated request through the Organization's compute gateway."""

    # Arrange
    user = users[0]
    await create_ready_infrastructure(user, slug="local", name="Local testing")
    remote_infrastructure = await create_ready_infrastructure(user, slug="remote", name="Remote testing")
    organization = await create_organization(remote_infrastructure, user)
    await mark_organization_running(organization)
    app = await applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/xlonglink/sample:latest",
        user=user,
    )
    await applications.set_status(app.id, ApplicationStatus.running)
    registry = remote_infrastructure.compute
    captured: dict[str, object] = {}
    tls = object()

    def fake_ssl_context(*, cadata: str) -> object:
        """Capture the compute CA used for gateway verification."""

        captured["cadata"] = cadata
        return tls

    class FakeProxyResponse:
        """Stream one fake upstream application response."""

        status_code = 201
        headers = {
            "content-type": "text/plain",
            "set-cookie": "ignored=1",
            "content-length": "999",
        }

        async def aiter_bytes(self):
            """Yield the fake response body."""

            yield b"proxied"

        async def aclose(self) -> None:
            """Close the fake response."""

    class FakeProxyClient:
        """Fake upstream HTTP client for application proxy requests."""

        def __init__(self, **kwargs) -> None:
            """Capture client construction options."""

            captured["client_kwargs"] = kwargs

        def build_request(self, method: str, url: str, content, headers: dict[str, str]) -> SimpleNamespace:
            """Build one fake streaming request."""

            return SimpleNamespace(method=method, url=url, content=content, headers=headers)

        async def send(self, request: SimpleNamespace, stream: bool) -> FakeProxyResponse:
            """Capture the forwarded application request and return a stream."""

            content = b"".join([chunk async for chunk in request.content])
            captured["request"] = {
                "method": request.method,
                "url": request.url,
                "content": content,
                "headers": request.headers,
            }
            response = FakeProxyResponse()
            response.headers = {**response.headers, "content-type": captured.get("response_content_type", "text/plain")}
            assert stream
            return response

        async def aclose(self) -> None:
            """Close the fake client."""

    monkeypatch.setattr("src.routes.applications.ssl.create_default_context", fake_ssl_context)
    monkeypatch.setattr("src.routes.applications.httpx2.AsyncClient", FakeProxyClient)
    client = clients[0]

    # Act
    response = client.post(
        f"/api/applications/{app.id}/proxy/anything?answer=42",
        content=b"payload",
        headers={
            "accept": "application/json",
            "accept-language": "en-US",
            "authorization": "Bearer user-controlled",
            "content-type": "text/plain",
            "x-custom-feature": "user-controlled",
            "x-forwarded-for": "203.0.113.10",
            "x-user-id": "spoofed",
        },
    )

    # Assert
    assert response.status_code == 201
    assert response.text == "proxied"
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["content-type"] == "text/plain"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["content-security-policy"] == (
        "sandbox; default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
    )
    assert "set-cookie" not in response.headers
    assert captured["cadata"] == registry.gateway_ca_certificate
    assert captured["client_kwargs"] == {"follow_redirects": False, "timeout": 300.0, "verify": tls}
    forwarded = captured["request"]
    assert isinstance(forwarded, dict)
    assert forwarded["method"] == "POST"
    assert forwarded["url"] == "https://gateway.example/anything?answer=42"
    assert forwarded["content"] == b"payload"
    headers = forwarded["headers"]
    assert isinstance(headers, dict)
    assert headers["x-longlink-gateway-secret"] == registry.proxy_secret
    assert headers["x-longlink-application-id"] == str(app.id)
    assert headers["x-user-id"] == str(user.id)
    assert headers["content-type"] == "text/plain"
    assert "accept" not in headers
    assert "accept-language" not in headers
    assert "authorization" not in headers
    assert "cookie" not in headers
    assert "x-custom-feature" not in headers
    assert "x-forwarded-for" not in headers

    # Active documents must not cross the authenticated proxy boundary.
    captured["response_content_type"] = "text/html; charset=utf-8"
    root_response = client.get(f"/api/applications/{app.id}/proxy")
    assert root_response.status_code == 502
    assert root_response.json() == {"detail": "Application proxy returned an unsupported content type"}


async def test_application_proxy_requires_application_role_for_regular_member(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject app proxy access for regular organization members without an app role."""

    # Arrange
    owner = users[0]
    user = users[1]
    infrastructure = await create_ready_infrastructure(owner)
    organization = await create_organization(infrastructure, owner)
    await mark_organization_running(organization)
    app = await applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/xlonglink/sample:latest",
        user=owner,
    )
    await applications.set_status(app.id, ApplicationStatus.running)
    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=user.id,
                organization_id=organization.id,
                role=OrganizationRoles.read,
            )
        )
        await session.commit()
    client = clients[1]

    # Act
    response = client.get(f"/api/applications/{app.id}/proxy/pages.json")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Application read access required"}


async def test_application_proxy_returns_unavailable_when_gateway_request_fails(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Return unavailable when the authenticated cluster gateway request fails."""

    # Arrange
    user = users[0]
    infrastructure = await create_ready_infrastructure(user)
    organization = await create_organization(infrastructure, user)
    await mark_organization_running(organization)
    app = await applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/xlonglink/sample:latest",
        user=user,
    )
    await applications.set_status(app.id, ApplicationStatus.running)
    registry = infrastructure.compute
    captured: dict[str, object] = {}
    tls = object()

    def fake_ssl_context(*, cadata: str) -> object:
        """Return a test TLS context for the generated compute CA."""

        assert cadata == registry.gateway_ca_certificate
        return tls

    class FailingProxyClient:
        """Fake upstream HTTP client that fails application proxy requests."""

        def __init__(self, **kwargs) -> None:
            """Capture client construction options."""

            captured["client_kwargs"] = kwargs

        def build_request(self, method: str, url: str, content, headers: dict[str, str]) -> SimpleNamespace:
            """Build one fake streaming request."""

            captured["request"] = {"method": method, "url": url, "content": content, "headers": headers}
            return SimpleNamespace(method=method, url=url, content=content, headers=headers)

        async def send(self, request: SimpleNamespace, stream: bool) -> SimpleNamespace:
            """Raise a proxy transport error."""

            raise httpx2.HTTPError("gateway unavailable")

        async def aclose(self) -> None:
            """Close the fake client."""

    monkeypatch.setattr("src.routes.applications.ssl.create_default_context", fake_ssl_context)
    monkeypatch.setattr("src.routes.applications.httpx2.AsyncClient", FailingProxyClient)
    client = clients[0]

    # Act
    response = client.get(f"/api/applications/{app.id}/proxy/i18n/en.json")

    # Assert
    assert response.status_code == 503
    assert response.json() == {"detail": "Application proxy request failed"}
    assert captured["client_kwargs"] == {"follow_redirects": False, "timeout": 300.0, "verify": tls}
    forwarded = captured["request"]
    assert isinstance(forwarded, dict)
    assert forwarded["url"] == "https://gateway.example/i18n/en.json"


async def test_application_proxy_enforces_method_role(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject mutating proxy requests when the runtime role is read-only."""

    # Arrange
    user = users[0]
    infrastructure = await create_ready_infrastructure(user)
    organization = await create_organization(infrastructure, user)
    await mark_organization_running(organization)
    app = await applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/xlonglink/sample:latest",
        user=user,
    )
    await applications.set_status(app.id, ApplicationStatus.running)

    Session = await get_session()
    async with Session() as session:
        organization_membership = await session.get(UserOrganization, (user.id, organization.id))
        assert organization_membership is not None
        organization_membership.role = OrganizationRoles.read
        application_membership = await session.get(
            UserApplication,
            {
                "user_id": user.id,
                "organization_id": organization.id,
                "application_id": app.id,
            },
        )
        assert application_membership is not None
        application_membership.role = ApplicationRoles.read
        await session.commit()

    client = clients[0]

    # Act
    response = client.post(f"/api/applications/{app.id}/proxy/api/tasks")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Application write access required"}


async def test_organization_access_rejects_soft_deleted_membership(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject organization access when only a soft-deleted membership remains."""

    # Arrange
    owner = users[0]
    user = users[1]
    infrastructure = await create_ready_infrastructure(owner)
    organization = await create_organization(infrastructure, owner)
    await mark_organization_running(organization)
    await applications.create(
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
                role=OrganizationRoles.read,
                deleted_at=utcnow(),
            )
        )
        await session.commit()

    client = clients[1]

    # Act
    response = client.get(f"/api/organizations/{organization.id}/applications")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Access required"}


async def test_application_proxy_shows_loading_when_app_is_not_ready(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return a loading response while application reconciliation is pending."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure(owner)
    organization = await create_organization(infrastructure, owner)
    await mark_organization_running(organization)
    app = await applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=owner,
    )
    client = clients[0]

    # Act
    response = client.get(f"/api/applications/{app.id}/proxy/pages.json")

    # Assert
    assert response.status_code == 503
    assert response.text == ""
    assert response.headers["content-length"] == "0"
    assert response.headers["cache-control"] == "no-store"
