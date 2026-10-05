import httpx2
import pytest
import asyncio
from uuid import uuid4
from types import SimpleNamespace
from fastapi import Request
from contextlib import AsyncExitStack, asynccontextmanager
from src.routes.v1 import proxy
from collections.abc import AsyncIterator
from src.models.roles import OrganizationRoles
from src.models.statuses import Status

pytestmark = pytest.mark.no_db


@pytest.fixture
def request_scope(monkeypatch: pytest.MonkeyPatch) -> SimpleNamespace:
    """Supply authorized runtime boundaries while exercising the real proxy resource ownership."""

    # Keep HTTP cleanup observable through the production runtime scope.
    closed: list[str] = []
    solution = SimpleNamespace(
        id=uuid4(),
        organization_id=uuid4(),
        status=Status.running,
        secrets={"LONGLINK_IDENTITY_SECRET": "identity-secret-012345678901234567"},
    )
    registry = SimpleNamespace(gateway_url="https://gateway.example/", gateway_certificate=None, kubeconfig={})
    user = SimpleNamespace(id=uuid4())

    async def access(*args: object) -> tuple[SimpleNamespace, OrganizationRoles, SimpleNamespace]:
        """Return the authorized running Solution before and after admission."""

        return solution, OrganizationRoles.maintain, registry

    async def commit() -> None:
        """Release the authorization snapshot."""

    monkeypatch.setattr(proxy.organizations, "solution_runtime_access", access)
    request = Request(
        {
            "type": "http",
            "method": "POST",
            "scheme": "https",
            "server": ("platform.example", 443),
            "path": "/proxy/health%2Fstatus",
            "query_string": b"verbose=true&raw=%2F+%25",
            "headers": [(b"content-type", b"application/json"), (b"authorization", b"untrusted"), (b"host", b"untrusted")],
        }
    )
    return SimpleNamespace(
        solution=solution,
        registry=registry,
        user=user,
        closed=closed,
        kwargs={
            "request": request,
            "solution_id": solution.id,
            "path": "health%2Fstatus",
            "user": user,
            "session": SimpleNamespace(commit=commit),
        },
    )


class GatewayClient:
    """Share the fake gateway transport shape across resource-ownership tests."""

    closed: list[str]

    def __init__(self, **_kwargs: object) -> None:
        """Accept the request client configuration."""

    def build_request(self, method: str, url: str, *, content: AsyncIterator[bytes], headers: dict[str, str]) -> object:
        """Build an opaque request accepted by the fake transport."""

        return object()

    async def aclose(self) -> None:
        """Record client cleanup."""

        self.closed.append("client")


async def test_gateway_response_closes_client_when_response_close_fails(
    monkeypatch: pytest.MonkeyPatch, request_scope: SimpleNamespace
) -> None:
    """Close the client even when the streamed response fails to close."""

    # Provide independently observable response and client cleanup paths.
    class Response:
        status_code = 200
        headers = {"content-type": "text/plain"}

        async def aclose(self) -> None:
            """Fail response cleanup."""

            request_scope.closed.append("response")
            raise RuntimeError("response close failed")

    class Client(GatewayClient):
        """Return the upstream response."""

        closed = request_scope.closed

        async def send(self, request: object, stream: bool) -> Response:
            """Return the upstream response."""

            return Response()

    monkeypatch.setattr(proxy.httpx2, "AsyncClient", Client)

    # The response raises on scope exit, after the assertion that cleanup has not started.
    with pytest.raises(RuntimeError, match="response close failed"):  # noqa: PT012
        async with asynccontextmanager(proxy.runtime_scope)() as runtime:
            await proxy.proxy_solution_request(**request_scope.kwargs, runtime=runtime)
            assert request_scope.closed == []
    assert request_scope.closed == ["response", "client"]


async def test_gateway_request_closes_client_when_send_is_cancelled(
    monkeypatch: pytest.MonkeyPatch, request_scope: SimpleNamespace
) -> None:
    """Close partial acquisitions immediately when cancellation interrupts response creation."""

    class Client(GatewayClient):
        """Cancel request submission."""

        closed = request_scope.closed

        async def send(self, request: object, stream: bool) -> None:
            """Cancel request submission."""

            raise asyncio.CancelledError

    monkeypatch.setattr(proxy.httpx2, "AsyncClient", Client)

    # Failed acquisition cleans up before the caller releases runtime resources.
    async with asynccontextmanager(proxy.runtime_scope)() as runtime:
        with pytest.raises(asyncio.CancelledError):
            await proxy.proxy_solution_request(**request_scope.kwargs, runtime=runtime)
        assert request_scope.closed == ["client"]
    assert request_scope.closed == ["client"]


async def test_gateway_request_forwards_identity_and_defers_cleanup(
    monkeypatch: pytest.MonkeyPatch, request_scope: SimpleNamespace
) -> None:
    """Retain exact signed request construction and defer upstream cleanup until runtime exit."""

    # Use the real HTTP request builder while recording transport and cleanup.
    captured_request: httpx2.Request | None = None
    client_type = httpx2.AsyncClient

    class Response(httpx2.Response):
        """Record cleanup of the intercepted gateway response."""

        def __init__(self) -> None:
            """Supply the successful gateway response contract."""

            super().__init__(200, headers={"content-type": "text/plain"})

        async def aclose(self) -> None:
            """Record response cleanup."""

            request_scope.closed.append("response")
            await super().aclose()

    class Client(client_type):
        """Intercept gateway transport and record client cleanup."""

        async def send(self, request: httpx2.Request, *, stream: bool = False, **_kwargs: object) -> httpx2.Response:
            """Capture the actual outbound request without closing its response."""

            nonlocal captured_request
            captured_request = request
            assert stream is True
            return Response()

        async def aclose(self) -> None:
            """Record client cleanup before closing the HTTP client."""

            request_scope.closed.append("client")
            await super().aclose()

    monkeypatch.setattr(proxy.httpx2, "AsyncClient", Client)

    # Assert exact raw URL, routing authority, signed identity, and safe header forwarding.
    async with AsyncExitStack() as runtime:
        await proxy.proxy_solution_request(**request_scope.kwargs, runtime=runtime)
        assert captured_request is not None
        request = captured_request
        identity_token = request.headers["x-longlink-identity"]
        assert proxy.identity.identity_token_user(identity_token, "identity-secret-012345678901234567") == request_scope.user.id
        assert request.method == "POST"
        assert request.url == "https://gateway.example/health%2Fstatus?verbose=true&raw=%2F+%25"
        assert request.url.raw_path == b"/health%2Fstatus?verbose=true&raw=%2F+%25"
        assert request.headers["host"] == (
            f"solution-{request_scope.solution.id}.longlink-compute-{request_scope.solution.organization_id.hex}.svc.cluster.local"
        )
        assert request.headers["content-type"] == "application/json"
        assert "authorization" not in request.headers
        assert request_scope.closed == []
    assert request_scope.closed == ["response", "client"]
