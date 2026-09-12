import httpx2
import pytest
import asyncio
from httpx2 import AsyncClient
from typing import Protocol, TypedDict
from longlink import identity
from factories import Infrastructure, create_solution, create_organization, create_ready_infrastructure
from src.routes.v1 import proxy as proxy_routes
from collections.abc import Callable, Awaitable, AsyncIterator
from src.models.roles import OrganizationRoles
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.solutions import Solution
from src.database.models.association import UserOrganization
from src.database.models.organizations import Organization


class ProxyCapture(TypedDict, total=False):
    """Represent values observed by the proxy transport fakes."""

    close_count: int
    method: str
    url: str
    content: bytes
    content_type: str
    solution_id: str
    user_id: str


@pytest.fixture(autouse=True)
def development_transport(monkeypatch: pytest.MonkeyPatch) -> None:
    """Replace the Kubernetes tunnel boundary while exercising the real request lifetime."""

    class Kubernetes:
        """Own one fake loopback transport for the request."""

        def __init__(self, kubeconfig: object) -> None:
            """Accept the authorized compute connection."""

        async def portforward(self, name: str, namespace: str, port: int) -> int:
            """Validate the private Kourier target."""

            assert (name, namespace, port) == ("kourier", "kourier-system", 8444)
            return 18444

        async def aclose(self) -> None:
            """Close the request-owned tunnel."""

    class Transport(httpx2.AsyncBaseTransport):
        """Replace only the upstream network boundary."""

        def __init__(self, port: int, certificate: str | None) -> None:
            """Validate the acquired tunnel port."""

            assert port == 18444

        async def handle_async_request(self, request: httpx2.Request) -> httpx2.Response:
            """Fail unless the test supplies an upstream response."""

            raise AssertionError("Unexpected gateway request")

    monkeypatch.setattr(proxy_routes, "Kubernetes", Kubernetes)
    monkeypatch.setattr(proxy_routes.gateway, "Transport", Transport)


class ProxyResponse(Protocol):
    """Expose the upstream metadata and stream used by response fixtures."""

    status_code: int
    headers: dict[str, str]

    def aiter_bytes(self) -> AsyncIterator[bytes]:
        """Iterate the upstream response."""

        ...


class FakeGatewayResponse(httpx2.Response):
    """Represent an upstream HTTP response with observable cleanup."""

    def __init__(self, response: ProxyResponse, on_close: Callable[[], None] = lambda: None) -> None:
        """Store the upstream response and its cleanup callback."""

        super().__init__(response.status_code, headers=response.headers)
        self.upstream = response
        self.on_close = on_close

    async def aiter_bytes(self, chunk_size: int | None = None) -> AsyncIterator[bytes]:
        """Stream the configured upstream body."""

        async for chunk in self.upstream.aiter_bytes():
            yield chunk

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
        persisted_organization = await session.get(Organization, organization.id)
        assert persisted_organization is not None
        persisted_organization.status = Status.running
        persisted_organization.database_sync_pending = False
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

    async def send(_transport: object, request: httpx2.Request) -> httpx2.Response:
        """Record the actual signed HTTP request and return a safe response."""

        assert request.headers["host"] == f"solution-{solution.id}.longlink-compute-{solution.organization_id.hex}.svc.cluster.local"
        captured["method"] = request.method
        captured["url"] = str(request.url)
        captured["content"] = await request.aread()
        captured["content_type"] = request.headers["content-type"]
        captured["solution_id"] = str(solution.id)
        captured["user_id"] = str(identity.identity_token_user(request.headers["x-longlink-identity"], "test-identity-secret-01234567890"))

        def close() -> None:
            """Record upstream response cleanup."""

            captured["close_count"] = 1

        return FakeGatewayResponse(FakeProxyResponse(), close)

    monkeypatch.setattr(proxy_routes.gateway.Transport, "handle_async_request", send)
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

    monkeypatch.setattr(proxy_routes.gateway, "Transport", unexpected_gateway)

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
    monkeypatch.setattr(proxy_routes.gateway.Transport, "handle_async_request", fake_gateway_request(gateway_response))

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

    async def send(_transport: object, request: httpx2.Request) -> httpx2.Response:
        """Wait longer than the configured request deadline."""

        await asyncio.sleep(0.01)
        raise AssertionError("timed-out gateway request must not complete")

    monkeypatch.setattr(proxy_routes.gateway.Transport, "handle_async_request", send)
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
    monkeypatch.setattr(proxy_routes.gateway.Transport, "handle_async_request", fake_gateway_request(gateway_response))
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

        async def aiter_bytes(self) -> AsyncIterator[bytes]:
            """Provide an unused active-document body."""

            yield b"active"

    def close() -> None:
        """Record gateway cleanup."""

        nonlocal closed
        closed = True

    gateway_response = FakeGatewayResponse(FakeProxyResponse(), close)
    monkeypatch.setattr(proxy_routes.gateway.Transport, "handle_async_request", fake_gateway_request(gateway_response))

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
    monkeypatch.setattr(proxy_routes.gateway.Transport, "handle_async_request", fake_gateway_request(gateway_response))

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

    async def request(_transport: object, upstream: httpx2.Request) -> None:
        """Consume the request body so the route's size guard executes."""

        await upstream.aread()
        raise AssertionError("oversized request must not reach the gateway")

    monkeypatch.setattr(proxy_routes.gateway.Transport, "handle_async_request", request)
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
    solution, _infrastructure = await create_running_solution(users[0])
    captured: list[bytes] = []

    async def send(_transport: object, request: httpx2.Request) -> httpx2.Response:
        """Consume and record the body forwarded to the gateway."""

        captured.append(await request.aread())
        return httpx2.Response(200, text="uploaded")

    monkeypatch.setattr(proxy_routes.gateway.Transport, "handle_async_request", send)
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

    monkeypatch.setattr(proxy_routes.gateway.Transport, "handle_async_request", request)
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

    monkeypatch.setattr(proxy_routes.gateway, "Transport", unexpected_gateway)

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

    async def send(_transport: object, request: httpx2.Request) -> httpx2.Response:
        """Raise a proxy transport error."""

        raise httpx2.HTTPError("gateway unavailable")

    monkeypatch.setattr(proxy_routes.gateway.Transport, "handle_async_request", send)
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

    monkeypatch.setattr(proxy_routes.gateway, "Transport", unexpected_gateway)

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

    # Verify readiness has a readable error detail and cannot be cached.
    assert response.status_code == 503
    assert response.json() == {"detail": "Solution is not ready yet. Please try again shortly."}
    assert response.headers["cache-control"] == "no-store"


async def test_solution_proxy_returns_unavailable_when_gateway_requirement_is_missing(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Return unavailable when the Solution's signed identity key is absent."""

    # Arrange a running Solution with one persisted readiness requirement omitted.
    solution, _ = await create_running_solution(users[0])
    async with session_scope() as session:
        persisted_solution = await session.get(Solution, solution.id)
        assert persisted_solution is not None
        persisted_solution.secrets = {}
        await session.commit()

    def unexpected_gateway(*_args: object) -> object:
        """Fail when incomplete gateway configuration reaches the network boundary."""

        raise AssertionError("Gateway client must not be constructed")

    monkeypatch.setattr(proxy_routes.gateway, "Transport", unexpected_gateway)

    # Act
    response = await clients[0].get(f"/api/v1/solutions/{solution.id}/proxy/views.json")

    # Assert
    assert response.status_code == 503
    assert response.json() == {"detail": "Solution gateway is not ready"}
