import httpx2
from types import SimpleNamespace
from httpx2 import AsyncClient
from factories import create_application, create_organization, create_ready_infrastructure
from src.routes import proxy as proxy_routes
from collections.abc import Callable
from src.models.roles import OrganizationRoles
from src.database.session import get_session
from src.database.services import applications
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.association import UserOrganization


class FakeTLS:
    """Provide a minimal TLS context for Gateway proxy tests."""


def fake_ssl_context(
    tls: FakeTLS,
    *,
    expected_ca_certificate: str | None = None,
    captured: dict[str, object] | None = None,
) -> Callable[..., FakeTLS]:
    """Build one fake SSL context factory with optional CA verification and capture."""

    def create(*, cadata: str) -> FakeTLS:
        """Return the supplied TLS context after applying the requested assertions."""

        # Verify and capture the per-compute trust anchor when the test needs it.
        if expected_ca_certificate is not None:
            assert cadata == expected_ca_certificate
        if captured is not None:
            captured["cadata"] = cadata
        return tls

    return create


class FakeProxyClient:
    """Provide the no-op lifecycle shared by fake gateway HTTP clients."""

    def __init__(self, **kwargs) -> None:
        """Accept HTTP client construction options."""

    async def aclose(self) -> None:
        """Close the fake client."""


async def test_application_proxy_forwards_safe_content_and_rejects_active_content(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Forward an authenticated request through the Organization's compute gateway."""

    # Prepare a running remote Application and capture gateway traffic.
    user = users[0]
    remote_infrastructure = await create_ready_infrastructure(name="Remote testing")
    organization = await create_organization(user, infrastructure=remote_infrastructure)
    app = await create_application(organization, user, image="ghcr.io/xlonglink/sample:latest")
    await applications.mark_running(app.id)
    registry = remote_infrastructure.compute
    captured: dict[str, object] = {}

    tls = FakeTLS()

    class FakeProxyResponse:
        """Stream one fake upstream application response."""

        status_code = 201
        headers = {
            "content-type": "text/plain",
            "set-cookie": "ignored=1",
        }

        async def aiter_bytes(self):
            """Yield the fake response body."""

            # Emit one upstream chunk through the proxy response stream.
            yield b"proxied"

        async def aclose(self) -> None:
            """Close the fake response."""

    class ForwardingProxyClient(FakeProxyClient):
        """Fake upstream HTTP client for application proxy requests."""

        def __init__(self, **kwargs) -> None:
            """Capture client construction options."""

            captured["client_kwargs"] = kwargs

        def build_request(self, method: str, url: str, content, headers: dict[str, str]) -> SimpleNamespace:
            """Build one fake streaming request."""

            return SimpleNamespace(method=method, url=url, content=content, headers=headers)

        async def send(self, request: SimpleNamespace, stream: bool) -> FakeProxyResponse:
            """Capture the forwarded application request and return a stream."""

            # Drain the forwarded request stream into the captured gateway request.
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

    monkeypatch.setattr("src.adapters.gateway.ssl.create_default_context", fake_ssl_context(tls, captured=captured))
    monkeypatch.setattr("src.adapters.gateway.httpx2.AsyncClient", ForwardingProxyClient)
    client = clients[0]

    # Proxy a request carrying trusted and untrusted browser headers.
    response = await client.post(
        f"/api/applications/{app.id}/proxy/anything?answer=42",
        content=b"payload",
        headers={
            "accept": "application/json",
            "accept-language": "en-US",
            "authorization": "Bearer user-controlled",
            "content-type": "text/plain",
            "x-custom-feature": "user-controlled",
            "x-forwarded-for": "203.0.113.10",
            "x-longlink-api-key": "spoofed",
            "x-user-id": "spoofed",
        },
    )

    # Verify safe response metadata and authenticated upstream request fields.
    assert response.status_code == 201
    assert response.text == "proxied"
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["content-type"] == "text/plain"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["content-security-policy"] == (
        "sandbox; default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
    )
    assert "set-cookie" not in response.headers
    assert captured["cadata"] == registry.gateway_certificate
    assert captured["client_kwargs"] == {"follow_redirects": False, "timeout": 300.0, "verify": tls}
    forwarded = captured["request"]
    assert isinstance(forwarded, dict)
    assert forwarded["method"] == "POST"
    assert forwarded["url"] == "https://gateway.example/anything?answer=42"
    assert forwarded["content"] == b"payload"
    headers = forwarded["headers"]
    assert isinstance(headers, dict)
    assert headers["x-longlink-api-key"] == registry.gateway_api_key
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
    root_response = await client.get(f"/api/applications/{app.id}/proxy")
    assert root_response.status_code == 502
    assert root_response.json() == {"detail": "Application proxy returned an unsupported content type"}


async def test_application_proxy_rejects_oversized_request_body(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Reject request bodies larger than the configured proxy limit."""

    # Prepare a running Application and a client that consumes its request stream.
    owner = users[0]
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(owner, infrastructure=infrastructure)
    app = await create_application(organization, owner, image="ghcr.io/xlonglink/sample:latest")
    await applications.mark_running(app.id)

    tls = FakeTLS()

    class OversizedProxyClient(FakeProxyClient):
        """Consume the request body through the proxy size guard."""

        def build_request(self, method: str, url: str, content, headers: dict[str, str]) -> SimpleNamespace:
            """Build one fake streaming request."""

            return SimpleNamespace(content=content)

        async def send(self, request: SimpleNamespace, stream: bool) -> SimpleNamespace:
            """Consume the content so the route enforces the body limit."""

            # Consume the fake stream so the route's byte limit executes.
            async for _chunk in request.content:
                pass
            raise AssertionError("oversized request should fail before upstream send completes")

    monkeypatch.setattr(
        "src.adapters.gateway.ssl.create_default_context",
        fake_ssl_context(tls, expected_ca_certificate=infrastructure.compute.gateway_certificate),
    )
    monkeypatch.setattr("src.adapters.gateway.httpx2.AsyncClient", OversizedProxyClient)
    monkeypatch.setattr(proxy_routes, "PROXY_REQUEST_MAX_BYTES", 1024)
    client = clients[0]

    # Proxy a body one byte beyond the test limit.
    response = await client.post(f"/api/applications/{app.id}/proxy/upload", content=b"x" * 1025)

    # Verify the request is rejected before upstream delivery completes.
    assert response.status_code == 413
    assert response.json() == {"detail": "Application proxy request body is too large"}


async def test_application_proxy_returns_unavailable_when_gateway_is_not_ready(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Return unavailable when the compute gateway configuration is incomplete."""

    # Prepare a running Application with incomplete gateway TLS state.
    owner = users[0]
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(owner, infrastructure=infrastructure)
    app = await create_application(organization, owner, image="ghcr.io/xlonglink/sample:latest")
    await applications.mark_running(app.id)
    Session = await get_session()
    async with Session() as session:
        registry = await session.get(ComputeRegistry, infrastructure.compute.id)
        assert registry is not None
        registry.gateway_certificate = None
        await session.commit()
    client = clients[0]

    # Request an Application resource through the unavailable gateway.
    response = await client.get(f"/api/applications/{app.id}/proxy/pages.json")

    # Verify incomplete gateway configuration returns service unavailable.
    assert response.status_code == 503
    assert response.json() == {"detail": "Application gateway is not ready"}


async def test_application_proxy_allows_organization_read_members(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Allow app proxy access inherited from Organization read membership."""

    # Give a regular Organization member read access.
    owner = users[0]
    user = users[1]
    organization = await create_organization(owner)
    app = await create_application(organization, owner, image="ghcr.io/xlonglink/sample:latest")
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

    # Request the Application through the member's Organization access.
    response = await client.get(f"/api/applications/{app.id}/proxy/pages.json")

    # Verify access succeeds and reaches the loading-state response.
    assert response.status_code == 503


async def test_application_proxy_returns_unavailable_when_gateway_request_fails(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Return unavailable when the authenticated cluster gateway request fails."""

    # Prepare a running Application and a gateway client that fails transport.
    user = users[0]
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(user, infrastructure=infrastructure)
    app = await create_application(organization, user, image="ghcr.io/xlonglink/sample:latest")
    await applications.mark_running(app.id)

    tls = FakeTLS()

    class FailingProxyClient(FakeProxyClient):
        """Fake upstream HTTP client that fails application proxy requests."""

        def build_request(self, method: str, url: str, content, headers: dict[str, str]) -> SimpleNamespace:
            """Build one fake streaming request."""

            return SimpleNamespace()

        async def send(self, request: SimpleNamespace, stream: bool) -> SimpleNamespace:
            """Raise a proxy transport error."""

            raise httpx2.HTTPError("gateway unavailable")

    monkeypatch.setattr("src.adapters.gateway.ssl.create_default_context", fake_ssl_context(tls))
    monkeypatch.setattr("src.adapters.gateway.httpx2.AsyncClient", FailingProxyClient)
    client = clients[0]

    # Proxy a request through the failing gateway client.
    response = await client.get(f"/api/applications/{app.id}/proxy/i18n/en.json")

    # Verify transport failure is translated without losing the target URL.
    assert response.status_code == 503
    assert response.json() == {"detail": "Application proxy request failed"}


async def test_application_proxy_enforces_method_role(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject mutating proxy requests when the runtime role is read-only."""

    # Restrict the caller to Organization read access.
    user = users[0]
    organization = await create_organization(user)
    app = await create_application(organization, user, image="ghcr.io/xlonglink/sample:latest")
    await applications.mark_running(app.id)

    Session = await get_session()
    async with Session() as session:
        organization_membership = await session.get(UserOrganization, (user.id, organization.id))
        assert organization_membership is not None
        organization_membership.role = OrganizationRoles.read
        await session.commit()

    client = clients[0]

    # Attempt a mutating Application proxy request.
    response = await client.post(f"/api/applications/{app.id}/proxy/api/tasks")

    # Verify the HTTP method requires Organization write access.
    assert response.status_code == 403
    assert response.json() == {"detail": "Organization write access required"}


async def test_application_proxy_shows_loading_when_app_is_not_ready(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Return a loading response while application reconciliation is pending."""

    # Prepare an Application whose reconciliation is still pending.
    owner = users[0]
    organization = await create_organization(owner)
    app = await create_application(organization, owner)
    client = clients[0]

    # Request runtime content before the Application is ready.
    response = await client.get(f"/api/applications/{app.id}/proxy/pages.json")

    # Verify the loading response is empty and cannot be cached.
    assert response.status_code == 503
    assert response.text == ""
    assert response.headers["content-length"] == "0"
    assert response.headers["cache-control"] == "no-store"
