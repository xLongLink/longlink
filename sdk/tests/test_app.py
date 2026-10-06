import pytest
import logging
from pathlib import Path
from longlink import Context
from longlink import app as longlink_app
from pydantic import ValidationError
from longlink.app import LongLink
from sqlalchemy.exc import OperationalError
from longlink.logger import ApiAccessFilter
from fastapi.testclient import TestClient
from longlink.testclient import TestClient as SolutionTestClient


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


async def test_readiness_fails_when_the_solution_database_is_unavailable(solution_source: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Keep the readiness probe dependent on a live Solution database."""

    # Arrange
    monkeypatch.setenv("LONGLINK_ENV", "development")
    (solution_source.parent / "dev.db").mkdir()
    app = LongLink()

    # Verify the otherwise valid runtime fails specifically at SQLite connection setup.
    with pytest.raises(OperationalError, match="unable to open database file"):
        async with app.state.longlink.database.session():
            pytest.fail("A directory cannot be opened as a SQLite database")
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

    # Act
    app = LongLink()
    client = TestClient(app)
    with client:
        response = client.get("/views/issues/[issue]")
        views_response = client.get("/views.json")

    # Assert
    assert response.status_code == 200
    assert "text/plain" in response.headers["content-type"]
    assert response.text == content
    assert views_response.status_code == 200
    assert views_response.json() == [{"path": "views/issues/[issue]", "route": "/issues/:issue"}]


def test_view_catalog_orders_paths_and_redirects_to_first_static_view(solution_source: Path) -> None:
    """Keep lexical catalog order while skipping parameter routes for the root redirect."""

    # Arrange
    nested_directory = solution_source / "views" / "admin"
    nested_directory.mkdir()
    (nested_directory / "[id].jsx").write_text("export default function Detail() { return <Text>Detail</Text>; }", encoding="utf-8")
    (nested_directory / "alpha.jsx").write_text("export default function Alpha() { return <Text>Alpha</Text>; }", encoding="utf-8")
    (solution_source / "views" / "zebra.jsx").write_text("export default function Zebra() { return <Text>Zebra</Text>; }", encoding="utf-8")
    app = LongLink()
    client = TestClient(app)

    # Act
    with client:
        catalog_response = client.get("/views.json")
        root_response = client.get("/", follow_redirects=False)

    # Assert
    assert catalog_response.status_code == 200
    assert catalog_response.json() == [
        {"path": "views/admin/[id]", "route": "/admin/:id"},
        {"path": "views/admin/alpha", "route": "/admin/alpha"},
        {"path": "views/zebra", "route": "/zebra"},
    ]
    assert root_response.status_code == 307
    assert root_response.headers["location"] == "/admin/alpha"


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
