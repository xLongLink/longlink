import json
import pytest
import logging
from uuid import UUID
from typing import Annotated
from fastapi import Header, Depends, Response, APIRouter, HTTPException
from pathlib import Path
from longlink import User, Context, identity
from longlink import app as longlink_app
from pydantic import ValidationError
from sqlalchemy import event
from longlink.app import LongLink
from longlink.logger import ApiAccessFilter
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from longlink.database import audit, migrations
from sqlalchemy.engine import Engine
from fastapi.testclient import TestClient
from longlink.database.base import Database
from longlink.utils.settings import Envs


@pytest.mark.usefixtures("solution_source")
@pytest.mark.parametrize(("environment", "name"), [("development", "Development user"), ("testing", "Testing user")])
def test_longlink_solution_serves_runtime_routes_and_frontend(monkeypatch: pytest.MonkeyPatch, environment: str, name: str) -> None:
    """Serve SDK routes and the frontend with each environment's local user."""

    # Arrange
    monkeypatch.setenv("LONGLINK_ENV", environment)
    if environment == "development":
        migrations.make_migrations()
        migrations.apply_migrations()
    app = LongLink()
    disposed: list[Engine] = []

    @app.get("/api/me", response_model=str)
    async def current_user(value: Context) -> str:
        """Return the locally seeded user name."""

        # Observe actual engine shutdown after a request initializes the runtime database.
        event.listen(value.database.get_bind(), "engine_disposed", disposed.append)
        return value.user.name

    # Act
    client = TestClient(app)
    with client:
        frontend_response = client.get("/")
        frontend_route_response = client.get("/settings", headers={"accept": "text/html"})
        health_response = client.get("/health")
        ready_response = client.get("/ready")
        user_response = client.get("/api/me")

    # Assert
    assert frontend_response.status_code == 200
    assert "text/html" in frontend_response.headers["content-type"]
    assert frontend_route_response.status_code == 200
    assert "text/html" in frontend_route_response.headers["content-type"]
    assert health_response.status_code == 200
    assert health_response.json() == {"ok": True}
    assert ready_response.status_code == 200
    assert ready_response.json() == {"ok": True}
    assert user_response.status_code == 200
    assert user_response.json() == name
    assert len(disposed) == 1


@pytest.mark.usefixtures("solution_source")
async def test_startup_disposes_initialized_database_when_mcp_construction_fails(monkeypatch: pytest.MonkeyPatch) -> None:
    """Close initialized runtime resources when MCP startup fails before serving requests."""

    # Arrange
    monkeypatch.setenv("LONGLINK_ENV", "testing")
    app = LongLink()
    disposed: list[Engine] = []
    async with app.state.longlink.database.session() as session:
        event.listen(session.get_bind(), "engine_disposed", disposed.append)
    original_routes = app.routes.copy()
    failure = RuntimeError("MCP construction failed")

    def fail_construction(**_kwargs: object) -> None:
        """Fail only the MCP construction boundary after real database initialization."""

        raise failure

    monkeypatch.setattr(longlink_app.FastMCP, "from_openapi", fail_construction)

    # Act
    with pytest.raises(RuntimeError) as raised:
        async with app.router.lifespan_context(app):
            pytest.fail("Failed MCP startup must not serve requests")

    # Assert
    assert raised.value is failure
    assert len(disposed) == 1
    assert app.routes == original_routes


def test_readiness_fails_when_the_solution_database_is_unavailable(solution_source: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Keep the readiness probe dependent on a live Solution database."""

    # Arrange
    monkeypatch.setenv("LONGLINK_ENV", "development")
    (solution_source.parent / "dev.db").mkdir()
    app = LongLink()
    client = TestClient(app, raise_server_exceptions=False)

    # Act
    with client:
        frontend_response = client.get("/")
        health_response = client.get("/health")
        ready_response = client.get("/ready")

    # Assert
    assert frontend_response.status_code == 200
    assert "text/html" in frontend_response.headers["content-type"]
    assert health_response.status_code == 200
    assert health_response.json() == {"ok": True}
    assert ready_response.status_code == 500
    assert ready_response.json() == {"detail": "An unexpected error occurred. Please try again later."}
    assert ready_response.headers["cache-control"] == "no-store"


def test_startup_rejects_a_missing_embedded_frontend(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Require the packaged frontend entry point during startup."""

    # Point the runtime at a package root without the required frontend artifact.
    monkeypatch.setattr(longlink_app, "ROOT", tmp_path)

    # Reject startup with the missing artifact's exact location.
    frontend_index = tmp_path / ".static" / "web" / "index.html"
    with pytest.raises(ValidationError) as raised:
        LongLink()

    # Report the missing entry point as a filesystem validation error.
    assert raised.value.errors()[0]["loc"] == ("index",)
    assert raised.value.errors()[0]["type"] == "path_not_file"
    assert raised.value.errors()[0]["input"] == frontend_index


def test_production_startup_rejects_incomplete_runtime_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    """Require every Platform-owned runtime setting before production startup."""

    # Ensure the production contract is incomplete.
    monkeypatch.setenv("LONGLINK_ENV", "production")
    monkeypatch.delenv("LONGLINK_DATABASE_HOST", raising=False)

    # Reject startup before the Solution begins serving requests.
    with pytest.raises(ValidationError, match="DATABASE_HOST"):
        LongLink()


def test_startup_rejects_a_missing_solution_views_directory(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Require the generated View directory during startup."""

    # Arrange
    monkeypatch.chdir(tmp_path)

    # Act and assert
    with pytest.raises(ValueError, match=f"Solution source directory is required: {tmp_path / 'src' / 'views'}"):
        LongLink()


@pytest.mark.usefixtures("solution_source", "production_environment")
def test_production_startup_installs_one_access_filter(monkeypatch: pytest.MonkeyPatch) -> None:
    """Avoid duplicate Uvicorn access filtering across Solution instances."""

    # Arrange
    access_logger = logging.getLogger("uvicorn.access")
    monkeypatch.setattr(access_logger, "filters", [])

    # Act
    LongLink()
    LongLink()

    # Assert
    assert sum(isinstance(item, ApiAccessFilter) for item in access_logger.filters) == 1


def test_dynamic_view_is_registered_from_jsx_without_sidecar_metadata(solution_source: Path) -> None:
    """Expose a dynamic View's filename-derived route and exact source, ignoring JSON sidecars."""

    # Arrange
    content = "export default function Issue() { return <Text>Issue</Text>; }"
    view_path = solution_source / "views" / "issues" / "[issue].jsx"
    view_path.parent.mkdir(parents=True, exist_ok=True)
    view_path.write_text(content, encoding="utf-8")
    view_path.with_suffix(".json").write_text('{"name": "Custom title", "icon": "banknote"}', encoding="utf-8")
    runtime = json.loads((longlink_app.ROOT / ".static" / "web" / "views" / "runtime.json").read_text(encoding="utf-8"))

    # Act
    app = LongLink()
    client = TestClient(app)
    response = client.get("/views/issues/[issue]")
    views_response = client.get("/views.json")

    # Assert
    assert response.status_code == 200
    assert "text/plain" in response.headers["content-type"]
    assert response.text == content
    assert views_response.status_code == 200
    assert views_response.json() == {"views": [{"path": "views/issues/[issue]", "route": "/issues/:issue"}], "runtime": runtime}


def test_view_catalog_orders_paths_and_redirects_to_first_static_view(solution_source: Path) -> None:
    """Keep lexical catalog order while skipping nested and parameter routes for the root redirect."""

    # Arrange
    nested_directory = solution_source / "views" / "admin"
    nested_directory.mkdir()
    (nested_directory / "[id].jsx").write_text("export default function Detail() { return <Text>Detail</Text>; }", encoding="utf-8")
    (nested_directory / "alpha.jsx").write_text("export default function Alpha() { return <Text>Alpha</Text>; }", encoding="utf-8")
    (solution_source / "views" / "zebra.jsx").write_text("export default function Zebra() { return <Text>Zebra</Text>; }", encoding="utf-8")
    runtime = json.loads((longlink_app.ROOT / ".static" / "web" / "views" / "runtime.json").read_text(encoding="utf-8"))
    app = LongLink()
    client = TestClient(app)

    # Act
    catalog_response = client.get("/views.json")
    root_response = client.get("/", follow_redirects=False)

    # Assert
    assert catalog_response.status_code == 200
    assert catalog_response.json() == {
        "views": [
            {"path": "views/admin/[id]", "route": "/admin/:id"},
            {"path": "views/admin/alpha", "route": "/admin/alpha"},
            {"path": "views/zebra", "route": "/zebra"},
        ],
        "runtime": runtime,
    }
    assert root_response.status_code == 307
    assert root_response.headers["location"] == "/zebra"


def test_invalid_view_fails_during_registration(solution_source: Path) -> None:
    """Reject empty JSX source before registering any View routes."""

    # Arrange: Create a View with empty JSX source.
    (solution_source / "views" / "z-broken.jsx").write_text(" ", encoding="utf-8")

    # Act and assert
    with pytest.raises(ValueError, match="View source must contain"):
        LongLink()


@pytest.mark.parametrize(
    ("first_view", "second_view", "message"),
    [
        pytest.param("issues/[id].jsx", "issues/[issue_id].jsx", "Browser route '/issues/:issue_id' is already registered", id="dynamic"),
        pytest.param("index.jsx", "index/index.jsx", "Browser route '/' is already registered", id="static"),
    ],
)
def test_duplicate_browser_routes_are_rejected(solution_source: Path, first_view: str, second_view: str, message: str) -> None:
    """Reject distinct view files that resolve to one browser route."""

    # Arrange
    first_path = solution_source / "views" / first_view
    second_path = solution_source / "views" / second_view
    first_path.parent.mkdir(parents=True, exist_ok=True)
    second_path.parent.mkdir(parents=True, exist_ok=True)
    first_path.write_text("export default function First() { return <Text>First</Text>; }", encoding="utf-8")
    second_path.write_text("export default function Second() { return <Text>Second</Text>; }", encoding="utf-8")

    # Act and assert
    with pytest.raises(ValueError, match=message):
        LongLink()


@pytest.mark.usefixtures("solution_source")
def test_solution_router_serves_prefixed_route_before_frontend_fallback() -> None:
    """Serve an included Solution route at its explicit prefix before frontend fallback."""

    # Arrange
    solution_router = APIRouter(prefix="/api")

    @solution_router.get("/settings")
    async def settings_get_endpoint() -> dict[str, str]:
        """Return Solution-owned settings."""

        return {"source": "solution"}

    app = LongLink()
    app.include_router(solution_router)
    client = TestClient(app)

    # Act
    response = client.get("/api/settings", headers={"accept": "text/html"})
    root_response = client.get("/settings", headers={"accept": "application/json"})

    # Assert
    assert response.status_code == 200
    assert response.json() == {"source": "solution"}
    assert "application/json" in response.headers["content-type"]
    assert root_response.status_code == 404


@pytest.mark.usefixtures("solution_source")
def test_solution_add_api_route_rejects_view_endpoint_overlap(solution_source: Path) -> None:
    """Reject a direct Solution route that would overlap a registered View endpoint."""

    # Arrange
    (solution_source / "views" / "dashboard.jsx").write_text(
        "export default function Dashboard() { return <Text>Dashboard</Text>; }", encoding="utf-8"
    )
    app = LongLink()
    original_routes = app.router.routes.copy()

    async def solution_dashboard() -> dict[str, str]:
        """Return the Solution dashboard resource."""

        return {"source": "solution"}

    # Act and assert
    with pytest.raises(ValueError, match="View endpoint.*overlaps a Solution route"):
        app.add_api_route("/views/dashboard", solution_dashboard, methods=["GET"])

    assert app.router.routes == original_routes


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

    # Apply the development schema before starting the runtime.
    migrations.make_migrations()
    migrations.apply_migrations()

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
    app.state.longlink.database = Database(Envs(ENV="testing"))

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
        client.headers["x-longlink-identity"] = identity.create_identity_token(
            User(id=allowed_user, name="Allowed", email="allowed@example.com"), secret
        )
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
        client.headers["x-longlink-identity"] = identity.create_identity_token(
            User(id=denied_user, name="Denied", email="denied@example.com"), secret
        )
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
def test_mcp_can_restart_without_duplicate_routes_or_stale_sessions(monkeypatch: pytest.MonkeyPatch) -> None:
    """Rebuild the MCP catalog and close sessions across application lifespans."""

    # Use the same application for two lifespans with another route added between them.
    monkeypatch.setenv("LONGLINK_ENV", "testing")
    app = LongLink()
    disposed: list[Engine] = []

    async def database_engine() -> Engine:
        """Return the real initialized session bind and observe its eventual shutdown."""

        async with app.state.longlink.database.session() as session:
            engine = session.get_bind()
            event.listen(engine, "engine_disposed", disposed.append)
            return engine

    client = TestClient(app)
    with client:
        initialize_mcp(client)
        first_session = client.headers["mcp-session-id"]
        assert client.portal is not None
        first_engine = client.portal.call(database_engine)

    # The first lifespan releases its initialized database before restarting.
    assert disposed == [first_engine]

    @app.get("/api/value", response_model=int, operation_id="value")
    async def value() -> int:
        """Return a value from the newly registered operation."""

        return 42

    # A new lifespan gets a new transport and the newly completed route catalog.
    client = TestClient(app)
    with client:
        initialize_mcp(client)
        assert client.headers["mcp-session-id"] != first_session
        assert client.get("/ready").status_code == 200
        assert client.portal is not None
        second_engine = client.portal.call(database_engine)
        assert second_engine is not first_engine
        discovery = client.post("/mcp", json={"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
        stale = client.post("/mcp", json={"jsonrpc": "2.0", "id": 3, "method": "tools/list"}, headers={"mcp-session-id": first_session})

    # Old sessions are unavailable and only current Solution operations are discoverable.
    assert {tool["name"] for tool in discovery.json()["result"]["tools"]} == {"value"}
    assert stale.status_code == 404
    assert disposed == [first_engine, second_engine]


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
    app.state.longlink.database = Database(Envs(ENV="testing"))
    actual_identity = identity.create_identity_token(User(id=actual_user, name="Actual", email="actual@example.com"), secret)
    other_identity = identity.create_identity_token(User(id=UUID(int=1), name="Other", email="other@example.com"), secret)
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


@pytest.mark.usefixtures("solution_source")
@pytest.mark.parametrize("route", [pytest.param("/views/dashboard", id="static-route"), pytest.param("/views/{view}", id="dynamic-route")])
def test_solution_router_include_rolls_back_routes_before_a_view_collision(solution_source: Path, route: str) -> None:
    """Leave no routes registered when a later included route overlaps a View."""

    # Arrange
    (solution_source / "views" / "dashboard.jsx").write_text(
        "export default function Dashboard() { return <Text>Dashboard</Text>; }", encoding="utf-8"
    )
    router = APIRouter()

    @router.get("/safe")
    async def safe_endpoint() -> dict[str, str]:
        """Return a route that must be rolled back with the colliding route."""

        return {"source": "solution"}

    router.add_api_route(route, safe_endpoint, methods=["GET"])
    app = LongLink()
    original_routes = app.router.routes.copy()

    # Act and assert
    with pytest.raises(ValueError, match="View endpoint.*overlaps a Solution route"):
        app.include_router(router)

    # Assert
    assert app.router.routes == original_routes
