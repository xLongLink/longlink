import json
import pytest
from uuid import UUID
from typing import Annotated
from fastapi import Header, Depends, Response, APIRouter, HTTPException
from pathlib import Path
from longlink import Context, identity
from longlink.app import LongLink
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from longlink.database import audit
from fastapi.testclient import TestClient


def initialize_mcp(client: TestClient) -> None:
    """Initialize a real MCP session and retain its negotiated headers."""

    # Negotiate the transport before discovery and invocation.
    client.headers["accept"] = "application/json, text/event-stream"
    response = client.post(
        "/mcp",
        json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {"protocolVersion": "2025-11-25", "capabilities": {}, "clientInfo": {"name": "sdk-tests", "version": "1"}},
        },
    )
    assert response.status_code == 200, response.text
    client.headers["mcp-session-id"] = response.headers["mcp-session-id"]
    client.headers["mcp-protocol-version"] = response.json()["result"]["protocolVersion"]
    response = client.post("/mcp", json={"jsonrpc": "2.0", "method": "notifications/initialized"})
    assert response.status_code == 202


def test_mcp_discovers_late_routes_and_invokes_with_context(solution_source: Path) -> None:
    """Discover Solution operations without exposing Views or SDK infrastructure."""

    # Register a View, decorator route, and included router before the lifespan starts.
    (solution_source / "views" / "index.jsx").write_text("export default function Index() { return <Text>Home</Text>; }", encoding="utf-8")
    app = LongLink()
    app.openapi()

    @app.get("/api/me", response_model=str, operation_id="current_user")
    async def current_user(value: Context) -> str:
        """Return the contextual user name."""

        return value.user.name

    routes = APIRouter()

    @routes.get("/items/{item_id}", response_model=dict[str, int], operation_id="get_item")
    async def get_item(item_id: int) -> dict[str, int]:
        """Return the requested item."""

        return {"id": item_id}

    app.include_router(routes, prefix="/api")
    client = TestClient(app)

    # Discover and invoke operations over the actual MCP endpoint.
    with client:
        initialize_mcp(client)
        discovery = client.post("/mcp", json={"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
        tools = discovery.json()["result"]["tools"]
        invocation = client.post(
            "/mcp", json={"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "get_item", "arguments": {"item_id": 7}}}
        )
        context = client.post(
            "/mcp", json={"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "current_user", "arguments": {}}}
        )
        invalid = client.post(
            "/mcp",
            json={"jsonrpc": "2.0", "id": 5, "method": "tools/call", "params": {"name": "get_item", "arguments": {"item_id": "bad"}}},
        )
        direct = client.get("/api/items/7")
        frontend = client.get("/settings", headers={"accept": "text/html"})
        view = client.get("/views/index")

    # Keep schemas, HTTP APIs, contextual services, and frontend behavior intact.
    assert {tool["name"] for tool in tools} == {"current_user", "get_item"}
    item_tool = next(tool for tool in tools if tool["name"] == "get_item")
    assert item_tool["inputSchema"]["properties"]["item_id"]["type"] == "integer"
    assert invocation.json()["result"].get("isError") is not True
    assert json.loads(invocation.json()["result"]["content"][0]["text"]) == {"id": 7}
    assert context.json()["result"]["structuredContent"] == {"result": "Development user"}
    assert invalid.json()["result"]["isError"] is True
    assert direct.json() == {"id": 7}
    assert frontend.status_code == 200
    assert "text/html" in frontend.headers["content-type"]
    assert view.status_code == 200
    assert "export default" in view.text


@pytest.mark.usefixtures("solution_source", "production_environment")
@pytest.mark.parametrize("protocol_version", ["2025-11-25", "2026-07-28"])
def test_mcp_preserves_identity_and_endpoint_authorization(monkeypatch: pytest.MonkeyPatch, protocol_version: str) -> None:
    """Reject unauthenticated MCP requests and authorize every invocation independently."""

    # Use real signed assertions and an endpoint checking the current audit actor.
    secret = "test-mcp-identity-secret-01234567890"
    monkeypatch.setenv("LONGLINK_IDENTITY_SECRET", secret)
    app = LongLink()
    allowed_user = UUID(int=1)
    denied_user = UUID(int=2)

    @app.get("/api/private", response_model=str, operation_id="private_data")
    async def private_data(credentials: Annotated[HTTPAuthorizationCredentials, Depends(HTTPBearer())]) -> str:
        """Return private data only to the authorized actor."""

        if audit.current_actor.get() != allowed_user or credentials.credentials != "allowed-bearer":
            raise HTTPException(status_code=403, detail="Access denied")
        return str(audit.current_actor.get())

    client = TestClient(app)
    request = {"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "private_data", "arguments": {}}}

    # Validate both outer MCP admission and inner endpoint authorization.
    with client:
        anonymous = client.post("/mcp", json={"jsonrpc": "2.0", "id": 1, "method": "tools/list"})
        forged = client.post("/mcp", json=request, headers={"x-longlink-identity": "forged"})
        client.headers["x-longlink-identity"] = identity.create_identity_token(allowed_user, secret)
        client.headers["authorization"] = "Bearer allowed-bearer"
        if protocol_version == "2026-07-28":
            client.headers["accept"] = "application/json, text/event-stream"
            client.headers["mcp-protocol-version"] = protocol_version
            client.headers["mcp-method"] = "tools/call"
            client.headers["mcp-name"] = "private_data"
            request["params"]["_meta"] = {
                "io.modelcontextprotocol/protocolVersion": protocol_version,
                "io.modelcontextprotocol/clientCapabilities": {},
            }
        else:
            initialize_mcp(client)
        allowed = client.post("/mcp", json=request)
        direct_allowed = client.get("/api/private")
        del client.headers["authorization"]
        missing_bearer = client.post("/mcp", json=request)
        client.headers["authorization"] = "Bearer allowed-bearer"
        client.headers["x-longlink-identity"] = identity.create_identity_token(denied_user, secret)
        denied = client.post("/mcp", json=request)
        direct_denied = client.get("/api/private")
        del client.headers["x-longlink-identity"]
        missing = client.post("/mcp", json=request)

    # A session must not capture or reuse the actor from initialization or a previous call.
    assert anonymous.status_code == 401
    assert forged.status_code == 401
    assert allowed.json()["result"]["structuredContent"] == {"result": str(allowed_user)}
    assert direct_allowed.json() == str(allowed_user)
    assert missing_bearer.json()["result"]["isError"] is True
    assert "401" in missing_bearer.json()["result"]["content"][0]["text"]
    assert denied.json()["result"]["isError"] is True
    assert "403" in denied.json()["result"]["content"][0]["text"]
    assert direct_denied.status_code == 403
    assert missing.status_code == 401


@pytest.mark.usefixtures("solution_source")
def test_empty_mcp_catalog_does_not_allow_internal_tools() -> None:
    """Keep SDK operations unavailable even when there are no Solution tools."""

    # Start an otherwise empty Solution and attempt to call its excluded manifest operation.
    app = LongLink()
    client = TestClient(app)
    with client:
        initialize_mcp(client)
        discovery = client.post("/mcp", json={"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
        invocation = client.post(
            "/mcp",
            json={"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "get_views_views_json_get", "arguments": {}}},
        )

    # Excluding a tool applies to execution, not only discovery.
    assert discovery.json()["result"]["tools"] == []
    assert invocation.json()["result"]["isError"] is True


@pytest.mark.usefixtures("solution_source")
def test_mcp_can_restart_without_duplicate_routes_or_stale_sessions() -> None:
    """Rebuild the MCP catalog and close sessions across application lifespans."""

    # Use the same application for two lifespans with another route added between them.
    app = LongLink()
    client = TestClient(app)
    with client:
        initialize_mcp(client)
        first_session = client.headers["mcp-session-id"]

    @app.get("/api/value", response_model=int, operation_id="value")
    async def value() -> int:
        """Return a value from the newly registered operation."""

        return 42

    # A new lifespan gets a new transport and the newly completed route catalog.
    client = TestClient(app)
    with client:
        initialize_mcp(client)
        assert client.headers["mcp-session-id"] != first_session
        discovery = client.post("/mcp", json={"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
        stale = client.post("/mcp", json={"jsonrpc": "2.0", "id": 3, "method": "tools/list"}, headers={"mcp-session-id": first_session})

    # Old sessions are unavailable and only current Solution operations are discoverable.
    assert {tool["name"] for tool in discovery.json()["result"]["tools"]} == {"value"}
    assert stale.status_code == 404


@pytest.mark.usefixtures("solution_source")
def test_mcp_supports_current_protocol_without_a_legacy_handshake() -> None:
    """Discover and invoke tools with the 2026-07-28 single-exchange protocol."""

    # Register a Solution operation and connect using the current protocol's request metadata.
    app = LongLink()

    @app.get("/api/value", response_model=int, operation_id="value")
    async def value() -> int:
        """Return a value through the current MCP protocol."""

        return 42

    client = TestClient(app, headers={"accept": "application/json, text/event-stream", "mcp-protocol-version": "2026-07-28"})
    metadata = {"io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientCapabilities": {}}

    # Current MCP requests do not require initialize or an MCP session ID.
    with client:
        discovery = client.post(
            "/mcp",
            json={"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {"_meta": metadata}},
            headers={"mcp-method": "tools/list"},
        )
        invocation = client.post(
            "/mcp",
            json={"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "value", "arguments": {}, "_meta": metadata}},
            headers={"mcp-method": "tools/call", "mcp-name": "value"},
        )

    # Both discovery and structured tool results work without the legacy session transport.
    assert discovery.status_code == 200, discovery.text
    assert {tool["name"] for tool in discovery.json()["result"]["tools"]} == {"value"}
    assert "mcp-session-id" not in discovery.headers
    assert invocation.status_code == 200, invocation.text
    assert invocation.json()["result"]["structuredContent"] == {"result": 42}


@pytest.mark.usefixtures("solution_source", "production_environment")
def test_tool_arguments_cannot_override_request_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    """Keep declared API header parameters from impersonating another MCP caller."""

    # Expose credential header parameters while checking the real endpoint's audit identity.
    secret = "test-mcp-identity-secret-01234567890"
    monkeypatch.setenv("LONGLINK_IDENTITY_SECRET", secret)
    app = LongLink()

    @app.get("/api/credentials", response_model=dict[str, str | None], operation_id="credentials")
    async def credentials(
        response: Response,
        authorization: Annotated[str | None, Header()] = None,
        assertion: Annotated[str | None, Header(alias="x-longlink-identity")] = None,
        cookie: Annotated[str | None, Header()] = None,
    ) -> dict[str, str | None]:
        """Report the identity and bearer credential admitted by the Solution middleware."""

        response.set_cookie("user", "previous-tool-call")
        return {"user": str(audit.current_actor.get()), "authorization": authorization, "cookie": cookie}

    actual_user = UUID(int=2)
    actual_identity = identity.create_identity_token(actual_user, secret)
    other_identity = identity.create_identity_token(UUID(int=1), secret)
    client = TestClient(app, headers={"x-longlink-identity": actual_identity, "authorization": "Bearer actual", "cookie": "user=actual"})

    # Try to supply another user's valid signed token and bearer through declared tool parameters.
    with client:
        initialize_mcp(client)
        discovery = client.post("/mcp", json={"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
        tool = discovery.json()["result"]["tools"][0]
        assert {"authorization", "x-longlink-identity", "cookie"} <= tool["inputSchema"]["properties"].keys()
        request = {
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {
                "name": "credentials",
                "arguments": {"authorization": "Bearer other", "x-longlink-identity": other_identity, "cookie": "user=other"},
            },
        }
        invocation = client.post("/mcp", json=request)
        del client.headers["cookie"]
        without_cookie = client.post("/mcp", json=request)

    # The request's verified credentials win over model-controlled tool inputs.
    assert invocation.json()["result"]["structuredContent"] == {
        "user": str(actual_user),
        "authorization": "Bearer actual",
        "cookie": "user=actual",
    }
    assert without_cookie.json()["result"]["structuredContent"] == {
        "user": str(actual_user),
        "authorization": "Bearer actual",
        "cookie": None,
    }
