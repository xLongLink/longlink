import httpx2
import pytest
import pytest_asyncio
from fastapi import Request
from pathlib import Path
from conftest import TEST_PASSWORD
from longlink import app
from factories import create_solution, create_organization
from longlink.app import LongLink
from longlink.database import audit
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.solutions import Solution


@pytest_asyncio.fixture
async def mcp_gateway(
    users: tuple[User, User, User],
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> tuple[Solution, LongLink]:
    """Route the external gateway transport into a real isolated Solution runtime."""

    # Create valid persisted runtime state without contacting Kubernetes.
    secret = "test-mcp-gateway-secret-01234567890"
    organization = await create_organization(users[0])
    solution = await create_solution(organization, runtime_secrets={"LONGLINK_IDENTITY_SECRET": secret})
    async with session_scope() as session:
        persisted = await session.get(Solution, solution.id)
        assert persisted is not None
        persisted.status = Status.running
        await session.commit()

    # Supply a test-local frontend artifact without requiring an existing SDK build.
    frontend = tmp_path / ".static" / "web" / "index.html"
    frontend.parent.mkdir(parents=True)
    frontend.write_text("<!doctype html><html></html>", encoding="utf-8")
    monkeypatch.setattr(app, "ROOT", tmp_path)

    # The SDK discovers Solution sources from the current directory and process settings.
    (tmp_path / "src" / "views").mkdir(parents=True)
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("LONGLINK_ENV", "testing")
    monkeypatch.setenv("LONGLINK_IDENTITY_SECRET", secret)
    sdk = LongLink()

    @sdk.get("/api/identity", response_model=dict[str, str | None], operation_id="current_identity")
    async def current_identity(request: Request) -> dict[str, str | None]:
        """Expose the admitted actor and credentials to verify the real trust boundary."""

        return {
            "user": str(audit.current_actor.get()),
            "cookie": request.headers.get("cookie"),
            "authorization": request.headers.get("authorization"),
        }

    # Replace only gateway network I/O; retain actual proxy, MCP, and SDK route behavior.
    transport = httpx2.ASGITransport(app=sdk)

    async def send(_transport: object, request: httpx2.Request) -> httpx2.Response:
        """Deliver the actual signed gateway request to the real SDK application."""

        return await transport.handle_async_request(request)

    monkeypatch.setattr(httpx2.AsyncHTTPTransport, "handle_async_request", send)
    return solution, sdk


@pytest.mark.usefixtures("database_runtime")
async def test_mcp_proxy_supports_session_initialization_discovery_and_invocation(
    client: httpx2.AsyncClient,
    users: tuple[User, User, User],
    mcp_gateway: tuple[Solution, LongLink],
) -> None:
    """Retain the negotiated session through a complete legacy MCP tool invocation."""

    # Arrange
    solution, sdk = mcp_gateway
    path = f"/api/v1/solutions/{solution.id}/proxy/mcp"
    headers = {"accept": "application/json, text/event-stream"}

    # Act
    login = await client.post("/api/v1/auth/password/login", json={"email": users[0].email, "password": TEST_PASSWORD})
    assert login.status_code == 204, login.text
    async with sdk.router.lifespan_context(sdk):
        initialized = await client.post(
            path,
            headers=headers,
            json={
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2025-11-25",
                    "capabilities": {},
                    "clientInfo": {"name": "proxy-tests", "version": "1"},
                },
            },
        )
        assert initialized.status_code == 200, initialized.text
        assert initialized.headers.get("mcp-session-id")
        headers["mcp-session-id"] = initialized.headers["mcp-session-id"]
        headers["mcp-protocol-version"] = initialized.json()["result"]["protocolVersion"]
        notification = await client.post(path, headers=headers, json={"jsonrpc": "2.0", "method": "notifications/initialized"})
        discovery = await client.post(path, headers=headers, json={"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
        invocation = await client.post(
            path,
            headers=headers,
            json={"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "current_identity", "arguments": {}}},
        )

    # Assert
    assert notification.status_code == 202, notification.text
    assert discovery.status_code == 200, discovery.text
    assert {tool["name"] for tool in discovery.json()["result"]["tools"]} == {"current_identity"}
    assert invocation.status_code == 200, invocation.text
    assert invocation.json()["result"]["structuredContent"] == {"user": str(users[0].id), "cookie": None, "authorization": None}


async def test_mcp_proxy_supports_current_protocol_without_a_session(
    clients: tuple[httpx2.AsyncClient, httpx2.AsyncClient, httpx2.AsyncClient],
    users: tuple[User, User, User],
    mcp_gateway: tuple[Solution, LongLink],
) -> None:
    """Forward single-exchange protocol metadata through discovery and tool invocation."""

    # Arrange
    solution, sdk = mcp_gateway
    path = f"/api/v1/solutions/{solution.id}/proxy/mcp"
    headers = {"accept": "application/json, text/event-stream", "mcp-protocol-version": "2026-07-28"}
    metadata = {"io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientCapabilities": {}}

    # Act
    async with sdk.router.lifespan_context(sdk):
        discovery = await clients[0].post(
            path,
            headers={**headers, "mcp-method": "tools/list"},
            json={"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {"_meta": metadata}},
        )
        invocation = await clients[0].post(
            path,
            headers={**headers, "mcp-method": "tools/call", "mcp-name": "current_identity"},
            json={
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {"name": "current_identity", "arguments": {}, "_meta": metadata},
            },
        )

    # Assert
    assert discovery.status_code == 200, discovery.text
    assert {tool["name"] for tool in discovery.json()["result"]["tools"]} == {"current_identity"}
    assert "mcp-session-id" not in discovery.headers
    assert invocation.status_code == 200, invocation.text
    assert invocation.json()["result"]["structuredContent"] == {"user": str(users[0].id), "cookie": None, "authorization": None}


async def test_mcp_proxy_explains_browser_navigation_without_a_session(
    clients: tuple[httpx2.AsyncClient, httpx2.AsyncClient, httpx2.AsyncClient],
    mcp_gateway: tuple[Solution, LongLink],
) -> None:
    """Explain an actual uninitialized MCP GET instead of leaking its JSON-RPC error."""

    # Arrange
    solution, sdk = mcp_gateway

    # Act
    async with sdk.router.lifespan_context(sdk):
        response = await clients[0].get(
            f"/api/v1/solutions/{solution.id}/proxy/mcp", headers={"accept": "text/html,application/xhtml+xml,*/*"}
        )

    # Assert
    assert response.status_code == 400
    assert response.json() == {
        "detail": "This is an MCP endpoint, not a browser page. Connect using an MCP client to initialize a session."
    }
    assert response.headers["cache-control"] == "no-store"
