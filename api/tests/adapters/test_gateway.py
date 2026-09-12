import httpx2
import pytest
import asyncio
from uuid import uuid4
from types import SimpleNamespace
from typing import cast
from fastapi import Request
from contextlib import AsyncExitStack, nullcontext, asynccontextmanager
from src.routes.v1 import proxy
from collections.abc import AsyncIterator
from src.models.roles import OrganizationRoles
from src.models.statuses import Status

pytestmark = pytest.mark.no_db


@pytest.fixture
def request_scope(monkeypatch: pytest.MonkeyPatch) -> SimpleNamespace:
    """Supply authorized runtime boundaries while exercising the real proxy resource ownership."""

    # Keep activity and tunnel cleanup observable independently of HTTP cleanup.
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

    @asynccontextmanager
    async def activity(*args: object) -> AsyncIterator[SimpleNamespace]:
        """Observe activity release after all network resources."""

        try:
            yield SimpleNamespace(protect=nullcontext)
        finally:
            closed.append("activity")

    class Kubernetes:
        """Supply the request-owned tunnel boundary."""

        def __init__(self, kubeconfig: object) -> None:
            """Accept persisted compute credentials."""

        async def portforward(self, name: str, namespace: str, port: int) -> int:
            """Validate Kourier's private target."""

            assert (name, namespace, port) == ("kourier", "kourier-system", 8444)
            return 18444

        async def aclose(self) -> None:
            """Record tunnel cleanup."""

            closed.append("tunnel")

    monkeypatch.setattr(proxy.organizations, "solution_runtime_access", access)
    monkeypatch.setattr(proxy.databases, "activity", activity)
    monkeypatch.setattr(proxy, "Kubernetes", Kubernetes)
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


async def test_gateway_response_closes_client_when_response_close_fails(
    monkeypatch: pytest.MonkeyPatch, request_scope: SimpleNamespace
) -> None:
    """Close client, tunnel, and activity even when the streamed response fails to close."""

    # Provide independently observable response and client cleanup paths.
    class Response:
        status_code = 200
        headers = {"content-type": "text/plain"}

        async def aclose(self) -> None:
            """Fail response cleanup."""

            request_scope.closed.append("response")
            raise RuntimeError("response close failed")

    class Client:
        def __init__(self, **kwargs: object) -> None:
            """Accept the request client configuration."""

        def build_request(self, *args: object, **kwargs: object) -> object:
            """Build an opaque request accepted by the fake transport."""

            return object()

        async def send(self, request: object, stream: bool) -> Response:
            """Return the upstream response."""

            return Response()

        async def aclose(self) -> None:
            """Record client cleanup."""

            request_scope.closed.append("client")

    monkeypatch.setattr(proxy.httpx2, "AsyncClient", Client)

    # Exercise disconnect-before-iteration cleanup through the production runtime scope.
    with pytest.raises(RuntimeError, match="response close failed"):
        async with asynccontextmanager(proxy.runtime_scope)() as runtime:
            await proxy.proxy_solution_request(**request_scope.kwargs, runtime=runtime)
            assert request_scope.closed == []
    assert request_scope.closed == ["response", "client", "tunnel", "activity"]


async def test_gateway_request_closes_client_when_send_is_cancelled(
    monkeypatch: pytest.MonkeyPatch, request_scope: SimpleNamespace
) -> None:
    """Close partial acquisitions immediately when cancellation interrupts response creation."""

    class Client:
        def __init__(self, **kwargs: object) -> None:
            """Accept the request client configuration."""

        def build_request(self, *args: object, **kwargs: object) -> object:
            """Build an opaque request accepted by the fake transport."""

            return object()

        async def send(self, request: object, stream: bool) -> None:
            """Cancel request submission."""

            raise asyncio.CancelledError

        async def aclose(self) -> None:
            """Record client cleanup."""

            request_scope.closed.append("client")

    monkeypatch.setattr(proxy.httpx2, "AsyncClient", Client)

    # Failed acquisition cleans up before the caller releases activity.
    async with asynccontextmanager(proxy.runtime_scope)() as runtime:
        with pytest.raises(asyncio.CancelledError):
            await proxy.proxy_solution_request(**request_scope.kwargs, runtime=runtime)
        assert request_scope.closed == ["client", "tunnel"]
    assert request_scope.closed == ["client", "tunnel", "activity"]


async def test_gateway_request_forwards_identity_and_defers_cleanup(
    monkeypatch: pytest.MonkeyPatch, request_scope: SimpleNamespace
) -> None:
    """Retain exact signed request construction and defer upstream cleanup until runtime exit."""

    # Capture production client settings and use the real HTTP request builder.
    captured: dict[str, object] = {}
    client_type = httpx2.AsyncClient

    class Response:
        status_code = 200
        headers = {"content-type": "text/plain"}

        async def aclose(self) -> None:
            """Record response cleanup."""

            request_scope.closed.append("response")

    class Client:
        def __init__(self, *, verify: proxy.ssl.SSLContext, trust_env: bool, timeout: float, follow_redirects: bool) -> None:
            """Capture the gateway client configuration."""

            captured["client_kwargs"] = {
                "verify": verify,
                "trust_env": trust_env,
                "timeout": timeout,
                "follow_redirects": follow_redirects,
            }
            self.client = client_type(verify=verify, trust_env=trust_env, timeout=timeout, follow_redirects=follow_redirects)

        def build_request(self, method: str, url: str, *, content: AsyncIterator[bytes], headers: dict[str, str]) -> httpx2.Request:
            """Build the actual outgoing HTTP request."""

            return self.client.build_request(method, url, content=content, headers=headers)

        async def send(self, request: httpx2.Request, stream: bool) -> Response:
            """Capture the actual outbound request without closing its response."""

            captured["request"] = request
            assert stream is True
            return Response()

        async def aclose(self) -> None:
            """Record client cleanup."""

            request_scope.closed.append("client")
            await self.client.aclose()

    tls = proxy.ssl.create_default_context()
    request_scope.registry.gateway_certificate = "gateway-ca"

    def context(*, cadata: str) -> proxy.ssl.SSLContext:
        """Verify the persisted compute trust anchor."""

        assert cadata == "gateway-ca"
        return tls

    monkeypatch.setattr(proxy.env, "DEVELOPMENT", False)
    monkeypatch.setattr(proxy.httpx2, "AsyncClient", Client)
    monkeypatch.setattr(proxy.ssl, "create_default_context", context)

    # Assert exact raw URL, routing authority, signed identity, and safe header forwarding.
    async with AsyncExitStack() as runtime:
        await proxy.proxy_solution_request(**request_scope.kwargs, runtime=runtime)
        request = cast(httpx2.Request, captured["request"])
        identity_token = request.headers["x-longlink-identity"]
        assert proxy.identity.identity_token_user(identity_token, "identity-secret-012345678901234567") == request_scope.user.id
        assert captured["client_kwargs"] == {"follow_redirects": False, "trust_env": False, "timeout": 300.0, "verify": tls}
        assert request.method == "POST"
        assert request.url == "https://gateway.example/health%2Fstatus?verbose=true&raw=%2F+%25"
        assert request.url.raw_path == b"/health%2Fstatus?verbose=true&raw=%2F+%25"
        assert request.headers["host"] == (
            f"solution-{request_scope.solution.id}.longlink-compute-{request_scope.solution.organization_id.hex}.svc.cluster.local"
        )
        assert request.headers["content-type"] == "application/json"
        assert "authorization" not in request.headers
        assert request_scope.closed == []
    assert request_scope.closed == ["response", "client", "activity"]
