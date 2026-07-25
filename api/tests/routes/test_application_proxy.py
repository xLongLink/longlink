import httpx2
from types import SimpleNamespace
from factories import create_organization, mark_organization_running, create_ready_infrastructure
from src.models.roles import ApplicationRoles, OrganizationRoles
from fastapi.testclient import TestClient
from src.models.statuses import ApplicationStatus
from src.database.session import get_session
from src.database.services import applications
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.association import UserApplication, UserOrganization


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
    Session = await get_session()
    async with Session() as session:
        persisted = await session.get(ComputeRegistry, registry.id)
        assert persisted is not None
        persisted.gateway_previous_ca_certificate = "previous-ca"
        await session.commit()
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
    assert captured["cadata"] == f"{registry.gateway_ca_certificate}\nprevious-ca"
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
    captured["response_content_type"] = "image/svg+xml; charset=utf-8"
    root_response = client.get(f"/api/applications/{app.id}/proxy")
    assert root_response.status_code == 502
    assert root_response.json() == {"detail": "Application proxy returned an unsupported content type"}


async def test_application_proxy_rejects_oversized_request_body(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Reject request bodies larger than the current proxy limit."""

    # Arrange
    owner = users[0]
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
    tls = object()

    def fake_ssl_context(*, cadata: str) -> object:
        """Return a test TLS context."""

        assert cadata == infrastructure.compute.gateway_ca_certificate
        return tls

    class FakeProxyClient:
        """Consume the request body through the proxy size guard."""

        def __init__(self, **kwargs) -> None:
            """Accept client options."""

        def build_request(self, method: str, url: str, content, headers: dict[str, str]) -> SimpleNamespace:
            """Build one fake streaming request."""

            return SimpleNamespace(method=method, url=url, content=content, headers=headers)

        async def send(self, request: SimpleNamespace, stream: bool) -> SimpleNamespace:
            """Consume the content so the route enforces the body limit."""

            async for _chunk in request.content:
                pass
            raise AssertionError("oversized request should fail before upstream send completes")

        async def aclose(self) -> None:
            """Close the fake client."""

    monkeypatch.setattr("src.routes.applications.ssl.create_default_context", fake_ssl_context)
    monkeypatch.setattr("src.routes.applications.httpx2.AsyncClient", FakeProxyClient)
    client = clients[0]

    # Act
    response = client.post(f"/api/applications/{app.id}/proxy/upload", content=b"x" * (16 * 1024 * 1024 + 1))

    # Assert
    assert response.status_code == 413
    assert response.json() == {"detail": "Application proxy request body is too large"}


async def test_application_proxy_returns_unavailable_when_gateway_is_not_ready(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return unavailable when the compute gateway configuration is incomplete."""

    # Arrange
    owner = users[0]
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
        registry = await session.get(ComputeRegistry, infrastructure.compute.id)
        assert registry is not None
        registry.gateway_ca_certificate = None
        await session.commit()
    client = clients[0]

    # Act
    response = client.get(f"/api/applications/{app.id}/proxy/pages.json")

    # Assert
    assert response.status_code == 503
    assert response.json() == {"detail": "Application gateway is not ready"}


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
