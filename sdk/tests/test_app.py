import pytest
import logging
from pathlib import Path
from longlink import Context
from longlink import app as longlink_app
from pydantic import ValidationError
from contextlib import asynccontextmanager
from longlink.app import LongLink
from collections.abc import AsyncIterator
from longlink.logger import ApiAccessFilter
from fastapi.testclient import TestClient
from longlink.testclient import TestClient as SolutionTestClient


def create_runtime_client() -> TestClient:
    """Build an SDK runtime client from the current generated Solution source tree."""

    # Register the generated view catalog before serving requests.
    app = LongLink()
    return TestClient(app)


@pytest.mark.usefixtures("solution_source")
@pytest.mark.parametrize(("environment", "name"), [("development", "Development user"), ("testing", "Testing user")])
def test_longlink_solution_serves_runtime_routes_and_frontend(monkeypatch: pytest.MonkeyPatch, environment: str, name: str) -> None:
    """Serve SDK routes and the frontend with each environment's local user."""

    # Arrange
    monkeypatch.setenv("LONGLINK_ENV", environment)
    app = LongLink()

    @app.get("/api/me", response_model=str)
    async def current_user(value: Context) -> str:
        """Return the locally seeded user name."""

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


@pytest.mark.usefixtures("solution_source")
def test_solution_test_client_replaces_development_services_with_testing_services(monkeypatch: pytest.MonkeyPatch) -> None:
    """Select in-memory services and the testing user for an existing development app."""

    # Arrange
    monkeypatch.setenv("LONGLINK_ENV", "development")
    app = LongLink()
    assert "file" in app.state.longlink.storage.protocol

    @app.get("/api/me", response_model=str)
    async def testing_user(value: Context) -> str:
        """Return the user selected by the testing client."""

        return value.user.name

    # Act
    client = SolutionTestClient(app)
    with client:
        user_response = client.get("/api/me")

    # Assert
    assert user_response.status_code == 200
    assert user_response.json() == "Testing user"
    assert app.state.longlink.storage.protocol == "memory"
    assert app.state.longlink.database._env.ENV == "testing"


@pytest.mark.usefixtures("solution_source")
def test_readiness_fails_when_the_solution_database_is_unavailable() -> None:
    """Keep the readiness probe dependent on a live Solution database."""

    # Arrange
    class UnavailableSession:
        """Reject the database connectivity probe."""

        async def scalar(self, _statement: object) -> None:
            """Raise the connection failure observed by the readiness route."""

            raise RuntimeError("database unavailable")

    class UnavailableDatabase:
        """Provide only the unavailable database session boundary."""

        @asynccontextmanager
        async def session(self) -> AsyncIterator[UnavailableSession]:
            """Yield the unavailable database session."""

            yield UnavailableSession()

    app = LongLink()
    app.state.longlink.database = UnavailableDatabase()
    client = TestClient(app, raise_server_exceptions=False)

    # Act
    health_response = client.get("/health")
    ready_response = client.get("/ready")

    # Assert
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
    with pytest.raises(RuntimeError, match=f"LongLink embedded frontend is required: {frontend_index}"):
        LongLink()


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


@pytest.mark.usefixtures("solution_source")
def test_production_startup_installs_one_access_filter(monkeypatch: pytest.MonkeyPatch) -> None:
    """Avoid duplicate Uvicorn access filtering across Solution instances."""

    # Arrange
    access_logger = logging.getLogger("uvicorn.access")
    monkeypatch.setattr(
        longlink_app,
        "Envs",
        lambda: type("Settings", (), {"ENV": "production", "IDENTITY_SECRET": "identity-secret"})(),
    )
    monkeypatch.setattr(longlink_app, "create_fs", lambda _settings: object())
    monkeypatch.setattr(access_logger, "filters", [])

    # Act
    LongLink()
    LongLink()

    # Assert
    assert sum(isinstance(item, ApiAccessFilter) for item in access_logger.filters) == 1


def test_dynamic_view_is_registered_from_default_views_directory(solution_source: Path) -> None:
    """Expose a dynamic View with its filename-derived route and exact source."""

    # Build the default view tree.
    content = "export default function Issue() { return <Text>Issue</Text>; }"
    view_path = solution_source / "views" / "issues" / "[issue].jsx"
    view_path.parent.mkdir(parents=True, exist_ok=True)
    view_path.write_text(content, encoding="utf-8")

    # Start LongLink and request the registered view and view catalog.
    client = create_runtime_client()
    response = client.get("/views/issues/[issue]")
    views_response = client.get("/views.json")

    # Verify content and metadata came from the default view tree.
    assert response.status_code == 200
    assert "text/plain" in response.headers["content-type"]
    assert response.text == content
    assert views_response.json() == [{"path": "views/issues/[issue]", "route": "/issues/:issue"}]


def test_view_catalog_ignores_json_sidecars(solution_source: Path) -> None:
    """Derive the catalog only from JSX filenames, ignoring former metadata sidecars."""

    # Arrange
    (solution_source / "views" / "dashboard.jsx").write_text(
        "export default function Dashboard() { return <Text>Dashboard</Text>; }",
        encoding="utf-8",
    )
    (solution_source / "views" / "dashboard.json").write_text('{"name": "Custom title", "icon": "banknote"}', encoding="utf-8")
    client = create_runtime_client()

    # Act
    response = client.get("/views.json")

    # Assert
    assert response.status_code == 200
    assert response.json() == [{"path": "views/dashboard", "route": "/dashboard"}]


def test_view_catalog_uses_deterministic_path_order(solution_source: Path) -> None:
    """Use lexical view paths for catalog output."""

    # Arrange
    nested_directory = solution_source / "views" / "admin"
    nested_directory.mkdir()
    (nested_directory / "alpha.jsx").write_text("export default function Alpha() { return <Text>Alpha</Text>; }", encoding="utf-8")
    (solution_source / "views" / "zebra.jsx").write_text("export default function Zebra() { return <Text>Zebra</Text>; }", encoding="utf-8")
    client = create_runtime_client()

    # Act
    catalog_response = client.get("/views.json")
    root_response = client.get("/", follow_redirects=False)

    # Assert
    assert catalog_response.status_code == 200
    assert catalog_response.json() == [
        {"path": "views/admin/alpha", "route": "/admin/alpha"},
        {"path": "views/zebra", "route": "/zebra"},
    ]
    assert root_response.status_code == 307
    assert root_response.headers["location"] == "/admin/alpha"


def test_root_redirect_skips_dynamic_views(solution_source: Path) -> None:
    """Redirect to a navigable static view rather than an unresolved parameter route."""

    # Arrange
    issues_directory = solution_source / "views" / "issues"
    issues_directory.mkdir()
    (issues_directory / "[issue].jsx").write_text("export default function Issue() { return <Text>Issue</Text>; }", encoding="utf-8")
    (solution_source / "views" / "overview.jsx").write_text(
        "export default function Overview() { return <Text>Overview</Text>; }", encoding="utf-8"
    )
    client = create_runtime_client()

    # Act
    response = client.get("/", follow_redirects=False)

    # Assert
    assert response.status_code == 307
    assert response.headers["location"] == "/overview"


def test_invalid_view_fails_during_registration(solution_source: Path) -> None:
    """Reject empty JSX source before registering any View routes."""

    # Arrange: Discover the valid view before the invalid catalog entry.
    (solution_source / "views" / "valid.jsx").write_text("export default function Valid() { return <Text>Valid</Text>; }", encoding="utf-8")
    (solution_source / "views" / "z-broken.jsx").write_text(" ", encoding="utf-8")

    # Act and assert
    with pytest.raises(ValueError, match="View source must contain"):
        LongLink()


@pytest.mark.parametrize(
    ("first_view", "second_view", "message"),
    [
        pytest.param(
            "issues/[id].jsx",
            "issues/[issue_id].jsx",
            "Browser route '/issues/:issue_id' is already registered",
            id="dynamic",
        ),
        pytest.param("index.jsx", "index/index.jsx", "Browser route '/' is already registered", id="static"),
    ],
)
def test_duplicate_browser_routes_are_rejected(
    solution_source: Path,
    first_view: str,
    second_view: str,
    message: str,
) -> None:
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
