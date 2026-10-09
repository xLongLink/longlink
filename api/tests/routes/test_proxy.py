import ssl
import httpx2
import pytest
import asyncio
from uuid import UUID
from httpx2 import AsyncClient
from typing import Unpack, TypedDict
from conftest import UNTRUSTED_ORIGINS, assert_origin_rejected, untrusted_origin_headers
from longlink import identity
from factories import create_compute, create_solution, create_organization
from src.routes.v1 import proxy as proxy_routes
from collections.abc import Callable, Sequence, Awaitable, AsyncIterator, AsyncGenerator
from src.models.roles import OrganizationRoles
from src.models.statuses import Status
from src.database.session import session_scope
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.solutions import Solution
from src.database.models.association import UserOrganization


class GatewayStream(httpx2.AsyncByteStream):
    """Provide controllable upstream body streaming and observable cleanup."""

    def __init__(
        self,
        chunks: Sequence[bytes],
        error: Exception | None = None,
        on_close: Callable[[], None] = lambda: None,
    ) -> None:
        """Store the upstream body chunks and cleanup callback."""

        # Configure only the external body stream, leaving response behavior to HTTPX.
        self._chunks = chunks
        self._error = error
        self.on_close = on_close

    async def __aiter__(self) -> AsyncGenerator[bytes, None]:
        """Stream the configured upstream body, optionally failed."""

        # Preserve lazy streaming so failure tests observe partial response bodies.
        for chunk in self._chunks:
            yield chunk

        if self._error is not None:
            raise self._error

    async def aclose(self) -> None:
        """Record the gateway stream's release."""

        # Observe cleanup through the real response's close lifecycle.
        self.on_close()


def make_upstream(
    status_code: int,
    headers: dict[str, str],
    body: bytes | Sequence[bytes] = b"",
    *,
    error: Exception | None = None,
    on_close: Callable[[], None] = lambda: None,
) -> httpx2.Response:
    """Build a real upstream response with a controllable asynchronous body."""

    # Accept a single body for the common case without hiding the chunked stream.
    chunks = [body] if isinstance(body, bytes) else list(body)

    stream = GatewayStream(
        chunks,
        error=error,
        on_close=on_close,
    )

    return httpx2.Response(status_code, headers=headers, stream=stream)


def fake_gateway_request(response: httpx2.Response) -> Callable[..., Awaitable[httpx2.Response]]:
    """Return one gateway request handler that serves a fixed response."""

    async def request(*_args: object, **_kwargs: object) -> httpx2.Response:
        """Return the configured gateway response."""

        return response

    return request


def reject_gateway_access(monkeypatch: pytest.MonkeyPatch) -> None:
    """Fail the test if a rejected request reaches the gateway boundary."""

    # Rejected requests must return before opening the compute transport.
    def unexpected_gateway(*_args: object, **_kwargs: object) -> object:
        """Fail if a rejected request reaches the gateway boundary."""

        raise AssertionError("Gateway client must not be constructed")

    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", unexpected_gateway)


async def create_running_solution(user: User) -> tuple[Solution, ComputeRegistry]:
    """Create one Solution with the running state required for gateway tests."""

    # Arrange an assignable gateway target and its running Solution.
    compute = await create_compute()
    organization = await create_organization(user, compute=compute)

    # Persist runtime state directly because proxy admission does not consume release history.
    solution = Solution(
        organization_id=organization.id,
        name="dashboard",
        slug="dashboard",
        status=Status.running,
        secrets={"LONGLINK_IDENTITY_SECRET": "test-identity-secret-01234567890"},
    )
    async with session_scope() as session:
        session.add(solution)
        await session.commit()

    return solution, compute


@pytest.mark.parametrize(("request_content_type", "upstream_status"), [("text/plain", 201), (None, 200)])
async def test_solution_proxy_forwards_safe_content(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
    request_content_type: str | None,
    upstream_status: int,
) -> None:
    """Forward an authenticated request through the Organization's compute gateway."""

    # Arrange
    user = users[0]
    solution, _ = await create_running_solution(user)
    captured: dict[str, object] = {}

    async def send(_transport: object, request: httpx2.Request) -> httpx2.Response:
        """Record the actual signed HTTP request and return a safe response."""

        assert request.headers["host"] == f"solution-{solution.id}.longlink-compute-{solution.organization_id.hex}.svc.cluster.local"
        captured["method"] = request.method
        captured["url"] = str(request.url)
        captured["content"] = await request.aread()
        captured["content_type"] = request.headers.get("content-type")
        captured["has_content_type"] = "content-type" in request.headers
        captured["user_id"] = str(identity.identity_token_user(request.headers["x-longlink-identity"], "test-identity-secret-01234567890"))

        def close() -> None:
            """Record upstream response cleanup."""

            captured["close_count"] = 1

        return make_upstream(
            upstream_status,
            {"content-type": "text/plain", "set-cookie": "ignored=1"},
            b"proxied",
            on_close=close,
        )

    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", send)
    client = clients[0]

    # Act
    response = await client.post(
        f"/api/v1/solutions/{solution.id}/proxy/anything?answer=42",
        content=b"payload",
        headers={"content-type": request_content_type} if request_content_type is not None else {},
    )

    # Assert
    assert response.status_code == upstream_status
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
    assert captured.get("user_id") == str(user.id)
    assert captured["content_type"] == request_content_type
    assert captured["has_content_type"] is (request_content_type is not None)


async def test_solution_proxy_strips_credential_headers_and_pins_gateway_tls(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Keep browser credentials out of tenant workloads and pin gateway TLS."""

    # Arrange a running Solution with a deterministic gateway certificate.
    user = users[0]
    solution, compute = await create_running_solution(user)

    async with session_scope() as session:
        persisted_compute = await session.get(ComputeRegistry, compute.id)
        assert persisted_compute is not None
        persisted_compute.gateway_certificate = "test-gateway-ca"
        await session.commit()

    captured: dict[str, object] = {}
    real_create_context = ssl.create_default_context
    real_client = httpx2.AsyncClient

    def record_context(
        purpose: ssl.Purpose = ssl.Purpose.SERVER_AUTH,
        *,
        cafile: str | None = None,
        capath: str | None = None,
        cadata: str | None = None,
    ) -> ssl.SSLContext:
        """Record the CA bundle used for gateway verification."""

        captured["cadata"] = cadata

        return real_create_context()

    class ClientKwargs(TypedDict, total=False):
        """Type the gateway client's recorded constructor options."""

        follow_redirects: bool
        trust_env: bool
        timeout: float
        verify: ssl.SSLContext

    def record_client(*args: object, **kwargs: Unpack[ClientKwargs]) -> httpx2.AsyncClient:
        """Record client trust configuration while delegating to the real client."""

        follow_redirects = kwargs.get("follow_redirects")
        trust_env = kwargs.get("trust_env")
        timeout = kwargs.get("timeout")
        verify = kwargs.get("verify")

        assert not args
        assert isinstance(follow_redirects, bool)
        assert isinstance(trust_env, bool)
        assert isinstance(timeout, float)
        assert isinstance(verify, ssl.SSLContext)
        captured["follow_redirects"] = follow_redirects
        captured["trust_env"] = trust_env
        captured["timeout"] = timeout

        return real_client(*args, **kwargs)

    async def send(_transport: object, request: httpx2.Request) -> httpx2.Response:
        """Record the exact headers crossing into the tenant workload."""

        captured["upstream_headers"] = {key.lower(): value for key, value in request.headers.items()}

        return make_upstream(
            200,
            {"content-type": "text/plain", "mcp-session-id": "private-session", "mcp-protocol-version": "2025-11-25"},
            b"proxied",
        )

    monkeypatch.setattr(ssl, "create_default_context", record_context)
    monkeypatch.setattr(httpx2, "AsyncClient", record_client)
    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", send)

    # Act
    response = await clients[0].post(
        f"/api/v1/solutions/{solution.id}/proxy/anything",
        content=b"payload",
        headers={
            "content-type": "text/plain",
            "authorization": "Bearer browser-session",
            "x-forwarded-for": "203.0.113.7",
            "x-forwarded-host": "attacker.example",
            "mcp-session-id": "caller-session",
            "mcp-protocol-version": "2025-11-25",
            "mcp-method": "tools/call",
            "mcp-name": "private_tool",
            "last-event-id": "caller-event",
        },
    )

    # Assert
    assert response.status_code == 200
    upstream_headers = captured.get("upstream_headers")
    assert isinstance(upstream_headers, dict)
    assert upstream_headers["content-type"] == "text/plain"
    assert "x-longlink-identity" in upstream_headers
    assert "authorization" not in upstream_headers
    assert "cookie" not in upstream_headers
    assert "x-forwarded-for" not in upstream_headers
    assert "x-forwarded-host" not in upstream_headers
    assert "mcp-session-id" not in upstream_headers
    assert "mcp-protocol-version" not in upstream_headers
    assert "mcp-method" not in upstream_headers
    assert "mcp-name" not in upstream_headers
    assert "last-event-id" not in upstream_headers
    assert "mcp-session-id" not in response.headers
    assert "mcp-protocol-version" not in response.headers
    assert captured.get("cadata") == "test-gateway-ca"
    assert captured.get("follow_redirects") is False
    assert captured.get("trust_env") is False
    assert captured.get("timeout") == 300.0


@pytest.mark.parametrize("path", ["mcp", "mcp/"])
async def test_solution_proxy_preserves_mcp_transport_metadata(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
    path: str,
) -> None:
    """Forward resumability and negotiation metadata without exposing browser credentials."""

    # Arrange
    solution, _ = await create_running_solution(users[0])
    captured: dict[str, str] = {}

    async def send(_transport: object, request: httpx2.Request) -> httpx2.Response:
        """Record transport metadata at the external gateway boundary."""

        captured.update(request.headers)
        return make_upstream(
            200,
            {
                "content-type": "application/json",
                "mcp-session-id": "negotiated-session",
                "mcp-protocol-version": "2025-11-25",
                "set-cookie": "runtime=must-not-reach-browser",
            },
            b'{"jsonrpc":"2.0","id":1,"result":{"tools":[]}}',
        )

    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", send)

    # Act
    response = await clients[0].post(
        f"/api/v1/solutions/{solution.id}/proxy/{path}",
        headers={
            "accept": "application/json, text/event-stream",
            "mcp-session-id": "caller-session",
            "mcp-protocol-version": "2025-11-25",
            "mcp-method": "tools/list",
            "mcp-name": "list_tools",
            "last-event-id": "caller-event",
            "authorization": "Bearer must-not-reach-solution",
            "x-longlink-identity": "forged-identity",
        },
        json={"jsonrpc": "2.0", "id": 1, "method": "tools/list"},
    )

    # Assert
    assert response.status_code == 200
    assert response.json() == {"jsonrpc": "2.0", "id": 1, "result": {"tools": []}}
    assert captured["accept"] == "application/json, text/event-stream"
    assert captured["mcp-session-id"] == "caller-session"
    assert captured["mcp-protocol-version"] == "2025-11-25"
    assert captured["mcp-method"] == "tools/list"
    assert captured["mcp-name"] == "list_tools"
    assert captured["last-event-id"] == "caller-event"
    assert identity.identity_token_user(captured["x-longlink-identity"], "test-identity-secret-01234567890") == users[0].id
    assert "authorization" not in captured
    assert "cookie" not in captured
    assert response.headers["mcp-session-id"] == "negotiated-session"
    assert response.headers["mcp-protocol-version"] == "2025-11-25"
    assert "set-cookie" not in response.headers


async def test_solution_proxy_sanitizes_json_upstream_error(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Preserve public error details and retry metadata without exposing private diagnostics."""

    # Arrange
    solution, _ = await create_running_solution(users[0])
    close_count = 0

    def close() -> None:
        """Record upstream response cleanup on the error path."""

        nonlocal close_count
        close_count += 1

    gateway_response = make_upstream(
        429,
        {
            "content-type": "application/json",
            "retry-after": "17",
            "set-cookie": "upstream_session=private-json-cookie",
            "x-debug": "private-json-diagnostics",
        },
        b'{"detail":"Please retry shortly.","diagnostics":"private-json-diagnostics"}',
        on_close=close,
    )
    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", fake_gateway_request(gateway_response))

    # Act
    response = await clients[0].get(f"/api/v1/solutions/{solution.id}/proxy")

    # Assert
    assert response.status_code == 429
    assert response.json() == {"detail": "Please retry shortly."}
    assert response.headers["content-type"] == "application/json"
    assert response.headers["retry-after"] == "17"
    assert "set-cookie" not in response.headers
    assert "x-debug" not in response.headers
    assert close_count == 1


async def test_solution_proxy_sanitizes_html_upstream_error(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Replace private HTML errors with the public fallback while preserving upstream status."""

    # Arrange
    solution, _ = await create_running_solution(users[0])

    gateway_response = make_upstream(
        503,
        {
            "content-type": "text/html",
            "retry-after": "23",
            "set-cookie": "upstream_session=private-html-cookie",
            "x-debug": "private-html-diagnostics",
        },
        b"<html><body>private-html-diagnostics</body></html>",
    )
    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", fake_gateway_request(gateway_response))

    # Act
    response = await clients[0].get(f"/api/v1/solutions/{solution.id}/proxy")

    # Assert
    assert response.status_code == 503
    assert response.json() == {"detail": "The Solution could not complete the request. Please try again later."}
    assert response.headers["content-type"] == "application/json"
    assert response.headers["retry-after"] == "23"
    assert "set-cookie" not in response.headers
    assert "x-debug" not in response.headers


@pytest.mark.no_db
async def test_solution_proxy_rejects_anonymous_without_gateway_access(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reject unauthenticated proxy requests before solution access checks."""

    # Arrange
    reject_gateway_access(monkeypatch)

    # Act
    response = await client.get(f"/api/v1/solutions/{UUID(int=1)}/proxy/views.json")

    # Assert
    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


@pytest.mark.parametrize(
    ("body", "stream_error"),
    [
        pytest.param(b'{"detail":"   "}', None, id="whitespace-detail"),
        pytest.param(b'{"detail":123}', None, id="non-string-detail"),
        pytest.param(b"[1,2]", None, id="non-object-payload"),
        pytest.param(b'{"detail":"' + b"x" * (64 * 1024) + b'"}', None, id="oversized"),
        pytest.param([b'{"detail":"partial'], RecursionError("stream aborted"), id="aborted"),
    ],
)
async def test_solution_proxy_replaces_nonpublic_upstream_error_detail(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
    body: bytes | list[bytes],
    stream_error: Exception | None,
) -> None:
    """Replace non-public and unusable upstream errors with the safe fallback."""

    # Arrange
    solution, _ = await create_running_solution(users[0])

    gateway_response = make_upstream(502, {"content-type": "application/json"}, body, error=stream_error)
    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", fake_gateway_request(gateway_response))

    # Act
    response = await clients[0].get(f"/api/v1/solutions/{solution.id}/proxy")

    # Assert
    assert response.status_code == 502
    assert response.json() == {"detail": "The Solution could not complete the request. Please try again later."}
    assert response.headers["content-type"] == "application/json"


@pytest.mark.parametrize("origin", UNTRUSTED_ORIGINS)
async def test_solution_proxy_rejects_untrusted_origin_before_gateway_request(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    monkeypatch: pytest.MonkeyPatch,
    origin: str | None,
) -> None:
    """Reject missing, empty, and foreign origins before an authenticated write reaches the gateway."""

    # Fail if CSRF protection allows the request to reach the gateway.
    reject_gateway_access(monkeypatch)
    headers = untrusted_origin_headers(clients[0], origin)

    # Act
    response = await clients[0].post(
        f"/api/v1/solutions/{UUID(int=1)}/proxy/tasks",
        headers=headers,
    )

    # Assert
    assert_origin_rejected(response)


async def test_solution_proxy_streams_response_without_upstream_content_type(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Keep proxy safety headers when the gateway omits a content type."""

    # Arrange
    solution, _ = await create_running_solution(users[0])
    close_count = 0

    def close() -> None:
        """Record gateway resource cleanup."""

        nonlocal close_count
        close_count += 1

    gateway_response = make_upstream(201, {}, b"proxied", on_close=close)
    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", fake_gateway_request(gateway_response))

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

    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", send)
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

    # Arrange
    solution, _infrastructure = await create_running_solution(users[0])
    entered = asyncio.Event()
    release = asyncio.Event()
    cancellation: asyncio.CancelledError | None = None
    close_count = 0

    class BlockedStream(httpx2.AsyncByteStream):
        """Suspend upstream iteration until the production deadline cancels it."""

        async def __aiter__(self) -> AsyncGenerator[bytes, None]:
            """Signal entry and record the cancellation that interrupts the body."""

            # Block without a sleep or a test-generated timeout error.
            nonlocal cancellation
            entered.set()
            try:
                await release.wait()
            except asyncio.CancelledError as exc:
                cancellation = exc
                raise
            yield b"late"

        async def aclose(self) -> None:
            """Record gateway resource cleanup."""

            # Observe the real response's close lifecycle.
            nonlocal close_count
            close_count += 1

    stream = BlockedStream()
    gateway_response = httpx2.Response(
        200,
        headers={"content-type": "text/plain"},
        stream=stream,
    )
    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", fake_gateway_request(gateway_response))
    monkeypatch.setattr(proxy_routes, "PROXY_RESPONSE_TIMEOUT_SECONDS", 0.001)

    # Act: keep the watchdog outside the expected production timeout assertion.
    async with asyncio.timeout(5):
        with pytest.raises(TimeoutError) as timeout:
            await clients[0].get(f"/api/v1/solutions/{solution.id}/proxy")

    # Assert
    assert entered.is_set()
    assert not release.is_set()
    assert isinstance(cancellation, asyncio.CancelledError)
    assert timeout.value.__cause__ is cancellation
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

    def close() -> None:
        """Record gateway cleanup."""

        nonlocal closed
        closed = True

    gateway_response = make_upstream(200, {"content-type": content_type}, b"active", on_close=close)
    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", fake_gateway_request(gateway_response))

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

    def close() -> None:
        """Record the proxy resource release."""

        nonlocal close_count
        close_count += 1

    gateway_response = make_upstream(
        200,
        {"content-type": "text/plain"},
        b"partial",
        error=RuntimeError("upstream interrupted"),
        on_close=close,
    )
    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", fake_gateway_request(gateway_response))

    # Act and assert
    with pytest.raises(RuntimeError, match="upstream interrupted"):
        await clients[0].get(f"/api/v1/solutions/{solution.id}/proxy")
    assert close_count == 1


async def test_solution_proxy_forwards_streamed_request_body(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Forward a streamed request body without applying a Platform byte limit."""

    # Arrange
    solution, _infrastructure = await create_running_solution(users[0])
    captured: list[bytes] = []

    async def send(_transport: object, request: httpx2.Request) -> httpx2.Response:
        """Consume and record the body forwarded to the gateway."""

        captured.append(await request.aread())
        return httpx2.Response(200, text="uploaded")

    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", send)

    async def content() -> AsyncIterator[bytes]:
        """Stream request chunks without a Platform byte limit."""

        yield b"x" * 512
        yield b"x" * 513

    # Act
    response = await clients[0].post(f"/api/v1/solutions/{solution.id}/proxy/upload", content=content())

    # Assert
    assert response.status_code == 200
    assert response.text == "uploaded"
    assert captured == [b"x" * 1025]


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

    async def request(*_args: object, **_kwargs: object) -> httpx2.Response:
        """Record the authorized gateway request."""

        nonlocal called
        called = True
        return make_upstream(200, {"content-type": "application/json"}, b"{}")

    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", request)
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
    reject_gateway_access(monkeypatch)

    # Request the other Organization's runtime through an authenticated session.
    response = await clients[1].get(f"/api/v1/solutions/{solution.id}/proxy/views.json")

    # Verify authorization rejects the request.
    assert response.status_code == 403
    assert response.json() == {"detail": "Access required"}


def patch_runtime_access_once(monkeypatch: pytest.MonkeyPatch, mutate: Callable[[], Awaitable[None]]) -> None:
    """Apply one runtime revocation on first admission, then resolve fresh access."""

    real_access = proxy_routes.organizations.solution_runtime_access
    admitted = False

    async def access(session: AsyncSession, user_id: UUID, solution_id: UUID) -> tuple[Solution, OrganizationRoles, ComputeRegistry] | None:
        """Revoke runtime state once, then resolve access as the handler observes it."""

        nonlocal admitted
        if not admitted:
            admitted = True
            await mutate()
        return await real_access(session, user_id, solution_id)

    monkeypatch.setattr(proxy_routes.organizations, "solution_runtime_access", access)
    reject_gateway_access(monkeypatch)


async def test_solution_proxy_rechecks_access_after_runtime_admission(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reject proxy access revoked while the Organization database is waking."""

    # Arrange
    solution, _ = await create_running_solution(users[0])
    member = users[1]
    async with session_scope() as session:
        session.add(
            UserOrganization(
                user_id=member.id,
                organization_id=solution.organization_id,
                role=OrganizationRoles.read,
            )
        )
        await session.commit()

    async def revoke_membership() -> None:
        """Delete the member grant the handler observes on admission."""

        async with session_scope() as session:
            membership = await session.get(UserOrganization, (member.id, solution.organization_id))
            assert membership is not None
            await session.delete(membership)
            await session.commit()

    patch_runtime_access_once(monkeypatch, revoke_membership)

    # Act
    response = await clients[1].get(f"/api/v1/solutions/{solution.id}/proxy/views.json")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Access required"}


async def test_solution_proxy_rechecks_readiness_after_runtime_admission(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reject proxy traffic when the Solution leaves running state while its database wakes."""

    # Arrange
    solution, _ = await create_running_solution(users[0])

    async def leave_running_state() -> None:
        """Move the Solution out of running state before admission resolves."""

        async with session_scope() as session:
            persisted_solution = await session.get(Solution, solution.id)
            assert persisted_solution is not None
            persisted_solution.status = Status.creating
            await session.commit()

    patch_runtime_access_once(monkeypatch, leave_running_state)

    # Act
    response = await clients[0].get(f"/api/v1/solutions/{solution.id}/proxy/views.json")

    # Assert
    assert response.status_code == 503
    assert response.json() == {"detail": "Solution is not ready yet. Please try again shortly."}
    assert response.headers["cache-control"] == "no-store"


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

    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", send)
    client = clients[0]

    # Proxy a request through the failing gateway client.
    response = await client.get(f"/api/v1/solutions/{solution.id}/proxy/i18n/en.json")

    # Verify transport failure is translated without losing the target URL.
    assert response.status_code == 503
    assert response.json() == {"detail": "Solution proxy request failed"}


@pytest.mark.parametrize("method", ["PATCH", "POST", "PUT"])
async def test_solution_proxy_enforces_method_role(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    method: str,
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
    reject_gateway_access(monkeypatch)

    # Attempt a mutating Solution proxy request.
    response = await client.request(method, f"/api/v1/solutions/{solution.id}/proxy/api/tasks")

    # Verify the HTTP method requires its Organization role before reaching the gateway.
    assert response.status_code == 403
    assert response.json() == {"detail": "Organization write access required"}


async def test_solution_proxy_allows_write_member_to_post(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Forward a write-method proxy request from an Organization write member."""

    # Arrange
    user = users[0]
    solution, _ = await create_running_solution(user)
    async with session_scope() as session:
        organization_membership = await session.get(UserOrganization, (user.id, solution.organization_id))
        assert organization_membership is not None
        organization_membership.role = OrganizationRoles.write
        await session.commit()

    gateway_response = make_upstream(200, {"content-type": "application/json"}, b"{}")
    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", fake_gateway_request(gateway_response))

    # Act
    response = await clients[0].post(f"/api/v1/solutions/{solution.id}/proxy/api/tasks")

    # Assert
    assert response.status_code == 200
    assert response.json() == {}


async def test_solution_proxy_delete_rejects_write_member(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reject proxy DELETE from an Organization write member before the gateway."""

    # Arrange
    user = users[0]
    solution, _ = await create_running_solution(user)
    async with session_scope() as session:
        organization_membership = await session.get(UserOrganization, (user.id, solution.organization_id))
        assert organization_membership is not None
        organization_membership.role = OrganizationRoles.write
        await session.commit()

    reject_gateway_access(monkeypatch)

    # Act
    response = await clients[0].request("DELETE", f"/api/v1/solutions/{solution.id}/proxy/api/tasks")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Organization maintain access required"}


async def test_solution_proxy_delete_allows_maintain_member(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Forward proxy DELETE from an Organization maintain member to the gateway."""

    # Arrange
    user = users[0]
    solution, _ = await create_running_solution(user)
    async with session_scope() as session:
        organization_membership = await session.get(UserOrganization, (user.id, solution.organization_id))
        assert organization_membership is not None
        organization_membership.role = OrganizationRoles.maintain
        await session.commit()
    monkeypatch.setattr(
        httpx2.AsyncHTTPTransport,
        "handle_async_request",
        fake_gateway_request(make_upstream(200, {"content-type": "application/json"}, b"{}")),
    )

    # Act
    response = await clients[0].request("DELETE", f"/api/v1/solutions/{solution.id}/proxy/api/tasks")

    # Assert
    assert response.status_code == 200
    assert response.json() == {}


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

    reject_gateway_access(monkeypatch)

    # Act
    response = await clients[0].get(f"/api/v1/solutions/{solution.id}/proxy/views.json")

    # Assert
    assert response.status_code == 503
    assert response.json() == {"detail": "Solution gateway is not ready"}


async def test_solution_proxy_forwards_error_negotiation_headers(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Forward actionable error metadata without upstream cookies or body headers."""

    # Arrange
    solution, _ = await create_running_solution(users[0])

    gateway_response = make_upstream(
        401,
        {
            "content-type": "application/json",
            "www-authenticate": 'Bearer realm="solution"',
            "allow": "GET, POST",
            "set-cookie": "upstream_session=private-error-cookie",
            "content-length": "42",
        },
        b'{"detail":"Authentication required."}',
    )
    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", fake_gateway_request(gateway_response))

    # Act
    response = await clients[0].get(f"/api/v1/solutions/{solution.id}/proxy")

    # Assert
    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication required."}
    assert response.headers["www-authenticate"] == 'Bearer realm="solution"'
    assert response.headers["allow"] == "GET, POST"
    assert "set-cookie" not in response.headers
    assert response.headers.get("content-length") in (None, str(len(response.content)))
