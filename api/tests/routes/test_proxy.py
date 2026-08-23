import httpx2
import pytest
from uuid import UUID
from types import SimpleNamespace
from httpx2 import AsyncClient
from typing import TypedDict
from pathlib import Path
from factories import Infrastructure, create_application, create_organization, create_ready_infrastructure
from src.routes.v1 import proxy as proxy_routes
from collections.abc import Callable, Awaitable
from src.models.roles import OrganizationRoles
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.association import UserOrganization
from src.database.models.applications import Application


class ProxyCapture(TypedDict, total=False):
    """Represent values observed by the proxy transport fakes."""

    close_count: int
    client_identity: str
    client_kwargs: dict[str, object]
    method: str
    url: str
    content: bytes
    headers: dict[str, str]


def fake_ssl_context(
    tls: object,
    *,
    expected_ca_certificate: str | None = None,
) -> Callable[..., object]:
    """Build one fake SSL context factory with optional CA verification."""

    def create(*, cadata: str) -> object:
        """Return the supplied TLS context after applying the requested assertions."""

        # Verify the per-compute trust anchor when the test needs it.
        if expected_ca_certificate is not None:
            assert cadata == expected_ca_certificate
        return tls

    return create


class FakeGatewayResponse:
    """Represent a gateway response with observable cleanup."""

    def __init__(self, response: object, on_close: Callable[[], None]) -> None:
        """Store the upstream response and its cleanup callback."""

        self.response = response
        self.on_close = on_close

    async def aclose(self) -> None:
        """Release the gateway response."""

        self.on_close()


def fake_gateway_request(response: FakeGatewayResponse) -> Callable[..., Awaitable[FakeGatewayResponse]]:
    """Return one gateway request handler that serves a fixed response."""

    async def request(*_args: object, **_kwargs: object) -> FakeGatewayResponse:
        """Return the configured gateway response."""

        return response

    return request


async def set_application_running(application_id: UUID) -> None:
    """Persist the running state required by proxy tests."""

    # Set lifecycle state directly because proxy tests do not exercise reconciliation.
    async with session_scope() as session:
        application = await session.get(Application, application_id)
        assert application is not None
        application.status = Status.running
        await session.commit()


async def create_running_application(user: User) -> tuple[Application, Infrastructure]:
    """Create one Application with the running state required for gateway tests."""

    # Arrange an assignable gateway target and its running Application.
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(user, infrastructure=infrastructure)
    application = await create_application(organization, image="ghcr.io/xlonglink/sample:latest")
    await set_application_running(application.id)
    return application, infrastructure


async def test_application_proxy_forwards_safe_content(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Forward an authenticated request through the Organization's compute gateway."""

    # Prepare a running remote Application and capture gateway traffic.
    user = users[0]
    app, remote_infrastructure = await create_running_application(user)
    registry = remote_infrastructure.compute
    captured: ProxyCapture = {}

    class FakeTLS:
        """Capture the Platform client identity loaded into the TLS context."""

        def load_cert_chain(self, certfile: str) -> None:
            """Capture the temporary PEM identity configured for Gateway mTLS."""

            captured["client_identity"] = Path(certfile).read_text()

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

            captured["close_count"] = captured.get("close_count", 0) + 1

    class ForwardingProxyClient:
        """Fake upstream HTTP client for application proxy requests."""

        def __init__(self, **kwargs) -> None:
            """Capture client construction options."""

            captured["client_kwargs"] = kwargs

        async def aclose(self) -> None:
            """Close the fake client."""

        def build_request(self, method: str, url: str, content, headers: dict[str, str]) -> SimpleNamespace:
            """Build one fake streaming request."""

            return SimpleNamespace(method=method, url=url, content=content, headers=headers)

        async def send(self, request: SimpleNamespace, stream: bool) -> FakeProxyResponse:
            """Capture the forwarded application request and return a stream."""

            # Drain the forwarded request stream into the captured gateway request.
            content = b"".join([chunk async for chunk in request.content])
            captured["method"] = request.method
            captured["url"] = request.url
            captured["content"] = content
            captured["headers"] = request.headers
            return FakeProxyResponse()

    monkeypatch.setattr(
        "src.adapters.gateway.ssl.create_default_context",
        fake_ssl_context(tls, expected_ca_certificate=registry.gateway_certificate),
    )
    monkeypatch.setattr("src.adapters.gateway.httpx2.AsyncClient", ForwardingProxyClient)
    client = clients[0]

    # Proxy a request carrying trusted and untrusted browser headers.
    response = await client.post(
        f"/api/v1/applications/{app.id}/proxy/anything?answer=42",
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
    assert captured.get("close_count") == 1
    assert captured.get("client_identity") == registry.gateway_client_identity
    assert captured.get("method") == "POST"
    assert captured.get("url") == "https://gateway.example/anything?answer=42"
    assert captured.get("content") == b"payload"
    headers = captured.get("headers")
    assert headers is not None
    assert headers["x-longlink-application-id"] == str(app.id)
    assert headers["x-user-id"] == str(user.id)
    assert headers["content-type"] == "text/plain"
    assert {"accept", "accept-language", "authorization", "cookie", "x-custom-feature", "x-forwarded-for"}.isdisjoint(headers)


async def test_application_proxy_streams_response_without_upstream_content_type(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Keep proxy safety headers when the gateway omits a content type."""

    # Arrange
    application, _ = await create_running_application(users[0])
    close_count = 0

    class FakeProxyResponse:
        """Represent an upstream response without a content type."""

        status_code = 201
        headers: dict[str, str] = {}

        async def aiter_bytes(self):
            """Yield the upstream response body."""

            yield b"proxied"

    def close() -> None:
        """Record gateway resource cleanup."""

        nonlocal close_count
        close_count += 1

    gateway_response = FakeGatewayResponse(FakeProxyResponse(), close)
    monkeypatch.setattr("src.routes.v1.proxy.GatewayClient.request", fake_gateway_request(gateway_response))

    # Act
    response = await clients[0].get(f"/api/v1/applications/{application.id}/proxy")

    # Assert
    assert response.status_code == 201
    assert response.content == b"proxied"
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert "content-type" not in response.headers
    assert close_count == 1


@pytest.mark.parametrize("content_type", ["image/svg+xml; charset=utf-8", "application/json, text/html; charset=utf-8"])
async def test_application_proxy_rejects_active_content(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch,
    content_type: str,
) -> None:
    """Reject active upstream documents and close their gateway resources."""

    # Arrange
    application, _ = await create_running_application(users[0])
    closed = False

    class FakeProxyResponse:
        """Represent an active document returned by the upstream application."""

        status_code = 200
        headers = {"content-type": content_type}

    def close() -> None:
        """Record gateway cleanup."""

        nonlocal closed
        closed = True

    gateway_response = FakeGatewayResponse(FakeProxyResponse(), close)
    monkeypatch.setattr("src.routes.v1.proxy.GatewayClient.request", fake_gateway_request(gateway_response))

    # Act
    response = await clients[0].get(f"/api/v1/applications/{application.id}/proxy")

    # Assert
    assert response.status_code == 502
    assert response.json() == {"detail": "Application proxy returned an unsupported content type"}
    assert closed


async def test_application_proxy_closes_gateway_response_when_upstream_stream_fails(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Release gateway resources when an upstream response fails mid-stream."""

    # Arrange
    application, _ = await create_running_application(users[0])
    close_count = 0

    class FakeProxyResponse:
        """Produce one chunk before simulating an upstream stream failure."""

        status_code = 200
        headers = {"content-type": "text/plain"}

        async def aiter_bytes(self):
            """Fail after streaming an initial response chunk."""

            yield b"partial"
            raise RuntimeError("upstream interrupted")

    def close() -> None:
        """Record the proxy resource release."""

        nonlocal close_count
        close_count += 1

    gateway_response = FakeGatewayResponse(FakeProxyResponse(), close)
    monkeypatch.setattr("src.routes.v1.proxy.GatewayClient.request", fake_gateway_request(gateway_response))

    # Act and assert
    with pytest.raises(RuntimeError, match="upstream interrupted"):
        await clients[0].get(f"/api/v1/applications/{application.id}/proxy")
    assert close_count == 1


async def test_application_proxy_rejects_oversized_request_body(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reject request bodies larger than the configured proxy limit."""

    # Arrange a running Application and consume its guarded request stream at the gateway boundary.
    app, _infrastructure = await create_running_application(users[0])

    async def request(*_args: object, content, **_kwargs: object) -> None:
        """Consume the request body so the route's size guard executes."""

        async for _chunk in content:
            pass
        raise AssertionError("oversized request must not reach the gateway")

    monkeypatch.setattr("src.routes.v1.proxy.GatewayClient.request", request)
    monkeypatch.setattr(proxy_routes, "PROXY_REQUEST_MAX_BYTES", 1024)

    # Act
    response = await clients[0].post(f"/api/v1/applications/{app.id}/proxy/upload", content=b"x" * 1025)

    # Assert
    assert response.status_code == 413
    assert response.json() == {"detail": "Application proxy request body is too large"}


async def test_application_proxy_forwards_request_body_at_configured_limit(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Forward request bodies equal to the configured proxy byte limit."""

    # Arrange
    app, infrastructure = await create_running_application(users[0])
    captured: list[bytes] = []
    tls = SimpleNamespace(load_cert_chain=lambda _certfile: None)

    class FakeResponse:
        """Provide a successful response after consuming the bounded body."""

        status_code = 200
        headers = {"content-type": "text/plain"}

        async def aiter_bytes(self):
            """Yield the proxied response body."""

            yield b"uploaded"

        async def aclose(self) -> None:
            """Close the fake upstream response."""

    class LimitProxyClient:
        """Capture the streamed upstream request body."""

        def __init__(self, **_kwargs: object) -> None:
            """Accept gateway client construction options."""

        async def aclose(self) -> None:
            """Close the fake client."""

        def build_request(self, _method: str, _url: str, content, headers: dict[str, str]) -> SimpleNamespace:
            """Build one request that retains its content stream."""

            return SimpleNamespace(content=content)

        async def send(self, request: SimpleNamespace, stream: bool) -> FakeResponse:
            """Consume and record the body forwarded to the gateway."""

            captured.append(b"".join([chunk async for chunk in request.content]))
            return FakeResponse()

    monkeypatch.setattr(
        "src.adapters.gateway.ssl.create_default_context",
        fake_ssl_context(tls, expected_ca_certificate=infrastructure.compute.gateway_certificate),
    )
    monkeypatch.setattr("src.adapters.gateway.httpx2.AsyncClient", LimitProxyClient)
    monkeypatch.setattr(proxy_routes, "PROXY_REQUEST_MAX_BYTES", 1024)

    # Act
    response = await clients[0].post(f"/api/v1/applications/{app.id}/proxy/upload", content=b"x" * 1024)

    # Assert
    assert response.status_code == 200
    assert response.text == "uploaded"
    assert captured == [b"x" * 1024]


async def test_application_proxy_returns_unavailable_when_gateway_is_not_ready(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Return unavailable when the compute gateway configuration is incomplete."""

    # Prepare a running Application with incomplete gateway TLS state.
    owner = users[0]
    app, infrastructure = await create_running_application(owner)
    async with session_scope() as session:
        registry = await session.get(ComputeRegistry, infrastructure.compute.id)
        assert registry is not None
        registry.gateway_certificate = None
        await session.commit()
    client = clients[0]

    # Request an Application resource through the unavailable gateway.
    response = await client.get(f"/api/v1/applications/{app.id}/proxy/pages.json")

    # Verify incomplete gateway configuration returns service unavailable.
    assert response.status_code == 503
    assert response.json() == {"detail": "Application gateway is not ready"}


async def test_application_proxy_allows_organization_read_members(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Allow app proxy access inherited from Organization read membership."""

    # Give a regular Organization member read access.
    owner = users[0]
    user = users[1]
    app, _infrastructure = await create_running_application(owner)
    called = False

    class FakeProxyResponse:
        """Return one successful proxied document."""

        status_code = 200
        headers = {"content-type": "application/json"}

        async def aiter_bytes(self):
            """Yield the proxied document."""

            yield b"{}"

    def close() -> None:
        """Record gateway cleanup."""

    async def request(*_args: object, **_kwargs: object) -> FakeGatewayResponse:
        """Record the authorized gateway request."""

        nonlocal called
        called = True
        return FakeGatewayResponse(FakeProxyResponse(), close)

    monkeypatch.setattr("src.routes.v1.proxy.GatewayClient.request", request)
    async with session_scope() as session:
        session.add(
            UserOrganization(
                user_id=user.id,
                organization_id=app.organization_id,
                role=OrganizationRoles.read,
            )
        )
        await session.commit()
    client = clients[1]

    # Request the Application through the member's Organization access.
    response = await client.get(f"/api/v1/applications/{app.id}/proxy/pages.json")

    # Verify read access reaches the configured compute gateway.
    assert response.status_code == 200
    assert response.json() == {}
    assert called


async def test_application_proxy_rejects_cross_organization_access(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject a tenant's request to another Organization's Application."""

    # Create an Application owned by a separate Organization.
    owner = users[0]
    organization = await create_organization(owner)
    application = await create_application(organization, image="ghcr.io/xlonglink/sample:latest")

    # Request the other Organization's runtime through an authenticated session.
    response = await clients[1].get(f"/api/v1/applications/{application.id}/proxy/pages.json")

    # Verify authorization rejects the request.
    assert response.status_code == 403
    assert response.json() == {"detail": "Access required"}


async def test_application_proxy_returns_unavailable_when_gateway_request_fails(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Return unavailable when the authenticated cluster gateway request fails."""

    # Prepare a running Application and a gateway client that fails transport.
    user = users[0]
    app, _ = await create_running_application(user)

    tls = SimpleNamespace(load_cert_chain=lambda _certfile: None)

    class FailingProxyClient:
        """Fake upstream HTTP client that fails application proxy requests."""

        def __init__(self, **_kwargs: object) -> None:
            """Accept gateway client construction options."""

        async def aclose(self) -> None:
            """Close the fake client."""

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
    response = await client.get(f"/api/v1/applications/{app.id}/proxy/i18n/en.json")

    # Verify transport failure is translated without losing the target URL.
    assert response.status_code == 503
    assert response.json() == {"detail": "Application proxy request failed"}


@pytest.mark.parametrize(
    ("method", "expected_detail"),
    [
        pytest.param("PATCH", "Organization write access required", id="patch"),
        pytest.param("POST", "Organization write access required", id="post"),
        pytest.param("PUT", "Organization write access required", id="put"),
        pytest.param("DELETE", "Organization maintain access required", id="delete"),
    ],
)
async def test_application_proxy_enforces_method_role(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    method: str,
    expected_detail: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reject mutating proxy requests when the runtime role is read-only."""

    # Restrict the caller to Organization read access.
    user = users[0]
    app, _ = await create_running_application(user)

    async with session_scope() as session:
        organization_membership = await session.get(UserOrganization, (user.id, app.organization_id))
        assert organization_membership is not None
        organization_membership.role = OrganizationRoles.read
        await session.commit()

    client = clients[0]

    def unexpected_gateway(*_args: object) -> object:
        """Fail if an unauthorized request reaches the gateway boundary."""

        raise AssertionError("Gateway client must not be constructed")

    monkeypatch.setattr(proxy_routes, "GatewayClient", unexpected_gateway)

    # Attempt a mutating Application proxy request.
    response = await client.request(method, f"/api/v1/applications/{app.id}/proxy/api/tasks")

    # Verify the HTTP method requires its Organization role before reaching the gateway.
    assert response.status_code == 403
    assert response.json() == {"detail": expected_detail}


async def test_application_proxy_shows_loading_when_app_is_not_ready(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Return a loading response while application reconciliation is pending."""

    # Prepare an Application whose reconciliation is still pending.
    owner = users[0]
    organization = await create_organization(owner)
    app = await create_application(organization)
    client = clients[0]

    # Request runtime content before the Application is ready.
    response = await client.get(f"/api/v1/applications/{app.id}/proxy/pages.json")

    # Verify the loading response is empty and cannot be cached.
    assert response.status_code == 503
    assert response.text == ""
    assert response.headers["content-length"] == "0"
    assert response.headers["cache-control"] == "no-store"
