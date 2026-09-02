import httpx2
import pytest
import asyncio
from uuid import UUID
from types import SimpleNamespace
from httpx2 import AsyncClient
from typing import TypedDict
from factories import Infrastructure, create_solution, create_organization, create_ready_infrastructure
from src.routes.v1 import proxy as proxy_routes
from collections.abc import Callable, Awaitable, AsyncIterator
from src.models.roles import OrganizationRoles
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.solutions import Solution
from src.database.models.association import UserOrganization


class ProxyCapture(TypedDict, total=False):
    """Represent values observed by the proxy transport fakes."""

    close_count: int
    method: str
    url: str
    content: bytes
    content_type: str
    solution_id: str
    user_id: str


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

    def __init__(self, response: object, on_close: Callable[[], None] = lambda: None) -> None:
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


async def create_running_solution(user: User) -> tuple[Solution, Infrastructure]:
    """Create one Solution with the running state required for gateway tests."""

    # Arrange an assignable gateway target and its running Solution.
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(user, infrastructure=infrastructure)
    solution = await create_solution(organization, image="ghcr.io/xlonglink/sample:latest")

    # Set lifecycle state directly because proxy tests do not exercise reconciliation.
    async with session_scope() as session:
        persisted_solution = await session.get(Solution, solution.id)
        assert persisted_solution is not None
        persisted_solution.secrets = {
            **persisted_solution.secrets,
            "LONGLINK_IDENTITY_SECRET": "test-identity-secret-01234567890",
        }
        persisted_solution.status = Status.running
        await session.commit()

    return solution, infrastructure


async def test_solution_proxy_forwards_safe_content(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Forward an authenticated request through the Organization's compute gateway."""

    # Prepare a running remote Solution and capture gateway traffic.
    user = users[0]
    solution, _ = await create_running_solution(user)
    captured: ProxyCapture = {}

    class FakeProxyResponse:
        """Stream one fake upstream solution response."""

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

    class Gateway:
        """Capture the proxy route's gateway request."""

        def __init__(self, *_args: str) -> None:
            """Accept the route's persisted gateway configuration."""

        async def request(
            self,
            *,
            solution_id: UUID,
            user_id: UUID,
            method: str,
            path: str,
            query: str,
            content_type: str | None,
            content: AsyncIterator[bytes],
        ) -> FakeGatewayResponse:
            """Record the route request and return a safe upstream response."""

            assert content_type is not None
            captured["method"] = method
            captured["url"] = f"https://gateway.example/{path}?{query}"
            captured["content"] = b"".join([chunk async for chunk in content])
            captured["content_type"] = content_type
            captured["solution_id"] = str(solution_id)
            captured["user_id"] = str(user_id)

            def close() -> None:
                """Record gateway response cleanup."""

                captured["close_count"] = 1

            return FakeGatewayResponse(FakeProxyResponse(), close)

    monkeypatch.setattr(proxy_routes, "GatewayClient", Gateway)
    client = clients[0]

    # Proxy a request with a content type and request body.
    response = await client.post(
        f"/api/v1/solutions/{solution.id}/proxy/anything?answer=42",
        content=b"payload",
        headers={
            "content-type": "text/plain",
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
    assert captured.get("method") == "POST"
    assert captured.get("url") == "https://gateway.example/anything?answer=42"
    assert captured.get("content") == b"payload"
    assert captured.get("solution_id") == str(solution.id)
    assert captured.get("user_id") == str(user.id)
    assert captured.get("content_type") == "text/plain"


@pytest.mark.parametrize("origin", [None, "https://attacker.example"])
async def test_solution_proxy_rejects_untrusted_origin_before_gateway_request(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
    origin: str | None,
) -> None:
    """Reject missing and foreign origins before an authenticated write reaches the gateway."""

    # Arrange a running Solution and fail if CSRF protection is bypassed.
    solution, _ = await create_running_solution(users[0])

    def unexpected_gateway(*_args: object) -> object:
        """Fail when an untrusted browser request reaches the compute boundary."""

        raise AssertionError("Gateway client must not be constructed")

    monkeypatch.setattr(proxy_routes, "GatewayClient", unexpected_gateway)

    # Remove the client's trusted default header for the missing-Origin case.
    if origin is None:
        clients[0].headers.pop("origin")

    # Act
    response = await clients[0].post(
        f"/api/v1/solutions/{solution.id}/proxy/tasks",
        headers={} if origin is None else {"origin": origin},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Origin required"}


async def test_solution_proxy_streams_response_without_upstream_content_type(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Keep proxy safety headers when the gateway omits a content type."""

    # Arrange
    solution, _ = await create_running_solution(users[0])
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
    response = await clients[0].get(f"/api/v1/solutions/{solution.id}/proxy")

    # Assert
    assert response.status_code == 201
    assert response.content == b"proxied"
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert "content-type" not in response.headers
    assert close_count == 1


async def test_solution_proxy_times_out_before_gateway_response(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reject a gateway request that does not produce response headers in time."""

    # Arrange a running Solution and a gateway that delays its initial response.
    solution, _infrastructure = await create_running_solution(users[0])

    class Gateway:
        """Delay the gateway response beyond the proxy request deadline."""

        def __init__(self, *_args: str) -> None:
            """Accept the persisted gateway configuration."""

        async def request(self, **_kwargs: object) -> FakeGatewayResponse:
            """Wait longer than the configured request deadline."""

            await asyncio.sleep(0.01)
            raise AssertionError("timed-out gateway request must not complete")

    monkeypatch.setattr(proxy_routes, "GatewayClient", Gateway)
    monkeypatch.setattr(proxy_routes, "PROXY_REQUEST_TIMEOUT_SECONDS", 0.001)

    # Act
    response = await clients[0].get(f"/api/v1/solutions/{solution.id}/proxy")

    # Assert
    assert response.status_code == 504
    assert response.json() == {"detail": "Solution proxy request timed out"}


async def test_solution_proxy_propagates_timed_out_response_stream(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Report and close a solution response that streams too slowly."""

    # Arrange a running Solution and an upstream response that misses the stream deadline.
    solution, _infrastructure = await create_running_solution(users[0])
    close_count = 0

    class SlowProxyResponse:
        """Delay the first upstream response chunk."""

        status_code = 200
        headers = {"content-type": "text/plain"}

        async def aiter_bytes(self):
            """Yield only after the configured stream deadline."""

            await asyncio.sleep(0.01)
            yield b"late"

    def close() -> None:
        """Record gateway resource cleanup."""

        nonlocal close_count
        close_count += 1

    gateway_response = FakeGatewayResponse(SlowProxyResponse(), close)
    monkeypatch.setattr("src.routes.v1.proxy.GatewayClient.request", fake_gateway_request(gateway_response))
    monkeypatch.setattr(proxy_routes, "PROXY_RESPONSE_TIMEOUT_SECONDS", 0.001)

    # Act and assert
    with pytest.raises(TimeoutError):
        await clients[0].get(f"/api/v1/solutions/{solution.id}/proxy")
    assert close_count == 1


@pytest.mark.parametrize(
    "content_type",
    [
        "image/svg+xml; charset=utf-8",
        "application/xhtml+xml; charset=utf-8",
        "application/json, text/html; charset=utf-8",
    ],
)
async def test_solution_proxy_rejects_active_content(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch,
    content_type: str,
) -> None:
    """Reject active upstream documents and close their gateway resources."""

    # Arrange
    solution, _ = await create_running_solution(users[0])
    closed = False

    class FakeProxyResponse:
        """Represent an active document returned by the upstream solution."""

        status_code = 200
        headers = {"content-type": content_type}

    def close() -> None:
        """Record gateway cleanup."""

        nonlocal closed
        closed = True

    gateway_response = FakeGatewayResponse(FakeProxyResponse(), close)
    monkeypatch.setattr("src.routes.v1.proxy.GatewayClient.request", fake_gateway_request(gateway_response))

    # Act
    response = await clients[0].get(f"/api/v1/solutions/{solution.id}/proxy")

    # Assert
    assert response.status_code == 502
    assert response.json() == {"detail": "Solution proxy returned an unsupported content type"}
    assert closed


async def test_solution_proxy_closes_gateway_response_when_upstream_stream_fails(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Release gateway resources when an upstream response fails mid-stream."""

    # Arrange
    solution, _ = await create_running_solution(users[0])
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
        await clients[0].get(f"/api/v1/solutions/{solution.id}/proxy")
    assert close_count == 1


async def test_solution_proxy_rejects_oversized_request_body(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reject request bodies larger than the configured proxy limit."""

    # Arrange a running Solution and consume its guarded request stream at the gateway boundary.
    solution, _infrastructure = await create_running_solution(users[0])

    async def request(*_args: object, content, **_kwargs: object) -> None:
        """Consume the request body so the route's size guard executes."""

        async for _chunk in content:
            pass
        raise AssertionError("oversized request must not reach the gateway")

    monkeypatch.setattr("src.routes.v1.proxy.GatewayClient.request", request)
    monkeypatch.setattr(proxy_routes, "PROXY_REQUEST_MAX_BYTES", 1024)

    # Act
    response = await clients[0].post(f"/api/v1/solutions/{solution.id}/proxy/upload", content=b"x" * 1025)

    # Assert
    assert response.status_code == 413
    assert response.json() == {"detail": "Solution proxy request body is too large"}


async def test_solution_proxy_forwards_request_body_at_configured_limit(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Forward request bodies equal to the configured proxy byte limit."""

    # Arrange
    solution, infrastructure = await create_running_solution(users[0])
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
    response = await clients[0].post(f"/api/v1/solutions/{solution.id}/proxy/upload", content=b"x" * 1024)

    # Assert
    assert response.status_code == 200
    assert response.text == "uploaded"
    assert captured == [b"x" * 1024]


async def test_solution_proxy_allows_organization_read_members(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Allow solution proxy access inherited from Organization read membership."""

    # Give a regular Organization member read access.
    owner = users[0]
    user = users[1]
    solution, _infrastructure = await create_running_solution(owner)
    called = False

    class FakeProxyResponse:
        """Return one successful proxied document."""

        status_code = 200
        headers = {"content-type": "application/json"}

        async def aiter_bytes(self):
            """Yield the proxied document."""

            yield b"{}"

    async def request(*_args: object, **_kwargs: object) -> FakeGatewayResponse:
        """Record the authorized gateway request."""

        nonlocal called
        called = True
        return FakeGatewayResponse(FakeProxyResponse())

    monkeypatch.setattr("src.routes.v1.proxy.GatewayClient.request", request)
    async with session_scope() as session:
        session.add(
            UserOrganization(
                user_id=user.id,
                organization_id=solution.organization_id,
                role=OrganizationRoles.read,
            )
        )
        await session.commit()
    client = clients[1]

    # Request the Solution through the member's Organization access.
    response = await client.get(f"/api/v1/solutions/{solution.id}/proxy/views.json")

    # Verify read access reaches the configured compute gateway.
    assert response.status_code == 200
    assert response.json() == {}
    assert called


async def test_solution_proxy_rejects_cross_organization_access(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reject a tenant's request to another Organization's Solution."""

    # Create a Solution owned by a separate Organization.
    owner = users[0]
    organization = await create_organization(owner)
    solution = await create_solution(organization, image="ghcr.io/xlonglink/sample:latest")

    def unexpected_gateway(*_args: object) -> object:
        """Fail if an unauthorized request reaches the gateway boundary."""

        raise AssertionError("Gateway client was constructed")

    monkeypatch.setattr(proxy_routes, "GatewayClient", unexpected_gateway)

    # Request the other Organization's runtime through an authenticated session.
    response = await clients[1].get(f"/api/v1/solutions/{solution.id}/proxy/views.json")

    # Verify authorization rejects the request.
    assert response.status_code == 403
    assert response.json() == {"detail": "Access required"}


async def test_solution_proxy_returns_unavailable_when_gateway_request_fails(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Return unavailable when the authenticated cluster gateway request fails."""

    # Prepare a running Solution and a gateway client that fails transport.
    user = users[0]
    solution, _ = await create_running_solution(user)

    tls = SimpleNamespace(load_cert_chain=lambda _certfile: None)

    class FailingProxyClient:
        """Fake upstream HTTP client that fails solution proxy requests."""

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
    response = await client.get(f"/api/v1/solutions/{solution.id}/proxy/i18n/en.json")

    # Verify transport failure is translated without losing the target URL.
    assert response.status_code == 503
    assert response.json() == {"detail": "Solution proxy request failed"}


@pytest.mark.parametrize(
    ("method", "expected_detail"),
    [
        pytest.param("PATCH", "Organization write access required", id="patch"),
        pytest.param("POST", "Organization write access required", id="post"),
        pytest.param("PUT", "Organization write access required", id="put"),
        pytest.param("DELETE", "Organization maintain access required", id="delete"),
    ],
)
async def test_solution_proxy_enforces_method_role(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    method: str,
    expected_detail: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reject mutating proxy requests when the runtime role is read-only."""

    # Restrict the caller to Organization read access.
    user = users[0]
    solution, _ = await create_running_solution(user)

    async with session_scope() as session:
        organization_membership = await session.get(UserOrganization, (user.id, solution.organization_id))
        assert organization_membership is not None
        organization_membership.role = OrganizationRoles.read
        await session.commit()

    client = clients[0]

    def unexpected_gateway(*_args: object) -> object:
        """Fail if an unauthorized request reaches the gateway boundary."""

        raise AssertionError("Gateway client must not be constructed")

    monkeypatch.setattr(proxy_routes, "GatewayClient", unexpected_gateway)

    # Attempt a mutating Solution proxy request.
    response = await client.request(method, f"/api/v1/solutions/{solution.id}/proxy/api/tasks")

    # Verify the HTTP method requires its Organization role before reaching the gateway.
    assert response.status_code == 403
    assert response.json() == {"detail": expected_detail}


async def test_solution_proxy_shows_loading_when_solution_is_not_ready(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Return a loading response while solution reconciliation is pending."""

    # Prepare a Solution whose reconciliation is still pending.
    owner = users[0]
    organization = await create_organization(owner)
    solution = await create_solution(organization)
    client = clients[0]

    # Request runtime content before the Solution is ready.
    response = await client.get(f"/api/v1/solutions/{solution.id}/proxy/views.json")

    # Verify the loading response is empty and cannot be cached.
    assert response.status_code == 503
    assert response.text == ""
    assert response.headers["content-length"] == "0"
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize("missing", ["gateway_url", "gateway_certificate", "gateway_client_identity", "identity_secret"])
async def test_solution_proxy_returns_unavailable_when_gateway_requirement_is_missing(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
    missing: str,
) -> None:
    """Return unavailable when any required compute gateway value is absent."""

    # Arrange a running Solution with one persisted readiness requirement omitted.
    solution, infrastructure = await create_running_solution(users[0])
    async with session_scope() as session:
        if missing == "identity_secret":
            persisted_solution = await session.get(Solution, solution.id)
            assert persisted_solution is not None
            persisted_solution.secrets = {}
        else:
            registry = await session.get(ComputeRegistry, infrastructure.compute.id)
            assert registry is not None
            setattr(registry, missing, None)
        await session.commit()

    def unexpected_gateway(*_args: object) -> object:
        """Fail when incomplete gateway configuration reaches the network boundary."""

        raise AssertionError("Gateway client must not be constructed")

    monkeypatch.setattr(proxy_routes, "GatewayClient", unexpected_gateway)

    # Act
    response = await clients[0].get(f"/api/v1/solutions/{solution.id}/proxy/views.json")

    # Assert
    assert response.status_code == 503
    assert response.json() == {"detail": "Solution gateway is not ready"}
