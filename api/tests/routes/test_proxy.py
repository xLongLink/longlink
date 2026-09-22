import httpx2
import pytest
import asyncio
from uuid import UUID
from httpx2 import AsyncClient
from longlink import identity
from factories import create_compute, create_solution, create_organization
from src.routes.v1 import proxy as proxy_routes
from collections.abc import Callable, Sequence, Awaitable, AsyncIterator
from src.models.roles import OrganizationRoles
from src.models.statuses import Status
from src.database.session import session_scope
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.organizations import DatabaseState
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.solutions import Solution
from src.database.models.association import UserOrganization
from src.database.models.organizations import Organization


class FakeGatewayResponse(httpx2.Response):
    """Represent an upstream HTTP response with observable cleanup."""

    def __init__(
        self,
        status_code: int,
        headers: dict[str, str],
        chunks: Sequence[bytes],
        delay_seconds: float = 0.0,
        error: Exception | None = None,
        on_close: Callable[[], None] = lambda: None,
    ) -> None:
        """Store the upstream status, headers, body chunks, and cleanup callback."""

        super().__init__(status_code, headers=headers)

        self._chunks = chunks
        self._delay_seconds = delay_seconds
        self._error = error
        self.on_close = on_close

    async def aiter_bytes(self, chunk_size: int | None = None) -> AsyncIterator[bytes]:
        """Stream the configured upstream body, optionally delayed or failed."""

        # Preserve lazy streaming so timeout and failure tests observe real cancellation.
        if self._delay_seconds:
            await asyncio.sleep(self._delay_seconds)

        for chunk in self._chunks:
            yield chunk

        if self._error is not None:
            raise self._error

    async def aclose(self) -> None:
        """Release the gateway response."""

        self.on_close()


def make_upstream(
    status_code: int,
    headers: dict[str, str],
    body: bytes | Sequence[bytes] = b"",
    *,
    delay_seconds: float = 0.0,
    error: Exception | None = None,
    on_close: Callable[[], None] = lambda: None,
) -> FakeGatewayResponse:
    """Build one fake upstream gateway response from status, headers, and body."""

    # Accept a single body for the common case without hiding the chunked stream.
    chunks = [body] if isinstance(body, bytes) else list(body)

    return FakeGatewayResponse(status_code, headers, chunks, delay_seconds, error, on_close)


def fake_gateway_request(response: FakeGatewayResponse) -> Callable[..., Awaitable[FakeGatewayResponse]]:
    """Return one gateway request handler that serves a fixed response."""

    async def request(*_args: object, **_kwargs: object) -> FakeGatewayResponse:
        """Return the configured gateway response."""

        return response

    return request


async def create_running_solution(user: User) -> tuple[Solution, ComputeRegistry]:
    """Create one Solution with the running state required for gateway tests."""

    # Arrange an assignable gateway target and its running Solution.
    compute = await create_compute()
    organization = await create_organization(user, compute=compute)
    solution = await create_solution(organization, image="ghcr.io/xlonglink/sample:latest")

    # Set lifecycle state directly because proxy tests do not exercise reconciliation.
    async with session_scope() as session:
        persisted_organization = await session.get(Organization, organization.id)
        assert persisted_organization is not None
        persisted_organization.status = Status.running
        persisted_organization.database_state = DatabaseState.available
        persisted_solution = await session.get(Solution, solution.id)
        assert persisted_solution is not None
        persisted_solution.secrets = {
            **persisted_solution.secrets,
            "LONGLINK_IDENTITY_SECRET": "test-identity-secret-01234567890",
        }
        persisted_solution.status = Status.running
        await session.commit()

    return solution, compute


async def test_solution_proxy_forwards_safe_content(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Forward an authenticated request through the Organization's compute gateway."""

    # Prepare a running remote Solution and capture gateway traffic.
    user = users[0]
    solution, _ = await create_running_solution(user)
    captured: dict[str, object] = {}

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

        return make_upstream(
            201,
            {"content-type": "text/plain", "set-cookie": "ignored=1"},
            b"proxied",
            on_close=close,
        )

    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", send)
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


async def test_solution_proxy_sanitizes_json_upstream_error(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Preserve public error details and retry metadata without exposing private diagnostics."""

    # Arrange
    solution, _ = await create_running_solution(users[0])

    gateway_response = make_upstream(
        429,
        {
            "content-type": "application/json",
            "retry-after": "17",
            "set-cookie": "upstream_session=private-json-cookie",
            "x-debug": "private-json-diagnostics",
        },
        b'{"detail":"Please retry shortly.","diagnostics":"private-json-diagnostics"}',
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


@pytest.mark.parametrize(
    "body",
    [
        pytest.param(b'{"detail":"   "}', id="whitespace-detail"),
        pytest.param(b'{"detail":123}', id="non-string-detail"),
        pytest.param(b"[1,2]", id="non-object-payload"),
        pytest.param(b"not-json", id="invalid-json"),
    ],
)
async def test_solution_proxy_replaces_nonpublic_upstream_error_detail(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
    body: bytes,
) -> None:
    """Replace non-public upstream error details with the safe fallback."""

    # Arrange
    solution, _ = await create_running_solution(users[0])

    gateway_response = make_upstream(502, {"content-type": "application/json"}, body)
    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", fake_gateway_request(gateway_response))

    # Act
    response = await clients[0].get(f"/api/v1/solutions/{solution.id}/proxy")

    # Assert
    assert response.status_code == 502
    assert response.json() == {"detail": "The Solution could not complete the request. Please try again later."}
    assert response.headers["content-type"] == "application/json"


@pytest.mark.parametrize("origin", [None, "", "https://attacker.example"])
async def test_solution_proxy_rejects_untrusted_origin_before_gateway_request(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
    origin: str | None,
) -> None:
    """Reject missing, empty, and foreign origins before an authenticated write reaches the gateway."""

    # Arrange a running Solution and fail if CSRF protection is bypassed.
    solution, _ = await create_running_solution(users[0])

    def unexpected_gateway(*_args: object) -> object:
        """Fail when an untrusted browser request reaches the compute boundary."""

        raise AssertionError("Gateway client must not be constructed")

    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", unexpected_gateway)

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

    # Arrange a running Solution and an upstream response that misses the stream deadline.
    solution, _infrastructure = await create_running_solution(users[0])
    close_count = 0

    def close() -> None:
        """Record gateway resource cleanup."""

        nonlocal close_count
        close_count += 1

    gateway_response = make_upstream(
        200,
        {"content-type": "text/plain"},
        b"late",
        delay_seconds=0.01,
        on_close=close,
    )
    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", fake_gateway_request(gateway_response))
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

    async def request(*_args: object, **_kwargs: object) -> FakeGatewayResponse:
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

    def unexpected_gateway(*_args: object) -> object:
        """Fail if an unauthorized request reaches the gateway boundary."""

        raise AssertionError("Gateway client was constructed")

    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", unexpected_gateway)

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

    def unexpected_gateway(*_args: object) -> object:
        """Fail if revoked access reaches the gateway boundary."""

        raise AssertionError("Gateway client was constructed")

    monkeypatch.setattr(proxy_routes.organizations, "solution_runtime_access", access)
    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", unexpected_gateway)


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

    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", unexpected_gateway)

    # Attempt a mutating Solution proxy request.
    response = await client.request(method, f"/api/v1/solutions/{solution.id}/proxy/api/tasks")

    # Verify the HTTP method requires its Organization role before reaching the gateway.
    assert response.status_code == 403
    assert response.json() == {"detail": expected_detail}


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

    def unexpected_gateway(*_args: object) -> object:
        """Fail if an unauthorized delete reaches the gateway boundary."""

        raise AssertionError("Gateway client must not be constructed")

    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", unexpected_gateway)

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

    def unexpected_gateway(*_args: object) -> object:
        """Fail when incomplete gateway configuration reaches the network boundary."""

        raise AssertionError("Gateway client must not be constructed")

    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", unexpected_gateway)

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


async def test_solution_proxy_replaces_oversized_upstream_error(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Replace oversized upstream errors with the public fallback."""

    # Arrange
    solution, _ = await create_running_solution(users[0])

    oversized = b'{"detail":"' + b"x" * (64 * 1024) + b'"}'
    gateway_response = make_upstream(502, {"content-type": "application/json"}, oversized)
    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", fake_gateway_request(gateway_response))

    # Act
    response = await clients[0].get(f"/api/v1/solutions/{solution.id}/proxy")

    # Assert
    assert response.status_code == 502
    assert response.json() == {"detail": "The Solution could not complete the request. Please try again later."}


async def test_solution_proxy_replaces_aborted_upstream_error(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Replace partially streamed upstream errors with the public fallback."""

    # Arrange
    solution, _ = await create_running_solution(users[0])

    gateway_response = make_upstream(
        502,
        {"content-type": "application/json"},
        [b'{"detail":"partial'],
        error=RecursionError("stream aborted"),
    )
    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", fake_gateway_request(gateway_response))

    # Act
    response = await clients[0].get(f"/api/v1/solutions/{solution.id}/proxy")

    # Assert
    assert response.status_code == 502
    assert response.json() == {"detail": "The Solution could not complete the request. Please try again later."}
