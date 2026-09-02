import pytest
import logging
from pytest import MonkeyPatch
from fastapi import FastAPI
from pathlib import Path
from longlink import app as longlink_app
from pydantic import ValidationError
from longlink.app import LongLink
from longlink.logger import ApiAccessFilter
from fastapi.testclient import TestClient


def create_runtime_client() -> TestClient:
    """Build an SDK runtime client from the current generated Application source tree."""

    # Register the generated view catalog before serving requests.
    app = FastAPI()
    LongLink(app)
    return TestClient(app)


@pytest.mark.usefixtures("application_source")
def test_longlink_app_serves_runtime_routes_and_frontend() -> None:
    """Serve SDK runtime endpoints and the embedded frontend."""

    # Initialize the development runtime and its in-process client.
    client = create_runtime_client()

    # Exercise runtime metadata and frontend fallback routes.
    frontend_response = client.get("/")
    frontend_route_response = client.get("/settings", headers={"accept": "text/html"})
    health_response = client.get("/health")
    # Verify each runtime route.
    assert frontend_response.status_code == 200
    assert "text/html" in frontend_response.headers["content-type"]
    assert frontend_route_response.status_code == 200
    assert "text/html" in frontend_route_response.headers["content-type"]
    assert health_response.status_code == 200
    assert health_response.json() == {"ok": True}


@pytest.mark.usefixtures("application_source")
def test_longlink_app_serves_runtime_routes_without_embedded_frontend(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Keep SDK runtime routes available when package frontend assets are absent."""

    # Arrange
    monkeypatch.setattr(longlink_app, "ROOT", tmp_path)
    app = FastAPI()
    LongLink(app)
    client = TestClient(app)

    # Act
    views_response = client.get("/views.json")
    frontend_response = client.get("/", headers={"accept": "text/html"})

    # Assert
    assert views_response.status_code == 200
    assert views_response.json() == []
    assert frontend_response.status_code == 404


def test_production_startup_rejects_incomplete_runtime_settings(monkeypatch: MonkeyPatch) -> None:
    """Require every Platform-owned runtime setting before production startup."""

    # Ensure the production contract is incomplete.
    monkeypatch.setenv("LONGLINK_ENV", "production")
    monkeypatch.delenv("LONGLINK_DATABASE_HOST", raising=False)

    # Reject startup before the application begins serving requests.
    with pytest.raises(ValidationError, match="DATABASE_HOST"):
        LongLink(FastAPI())


def test_startup_rejects_a_missing_application_views_directory(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    """Require the generated Application view directory during startup."""

    # Arrange
    monkeypatch.chdir(tmp_path)

    # Act and assert
    with pytest.raises(ValueError, match=f"Application source directory is required: {tmp_path / 'src' / 'views'}"):
        LongLink(FastAPI())


@pytest.mark.usefixtures("application_source")
def test_production_startup_installs_one_access_filter(monkeypatch: MonkeyPatch) -> None:
    """Avoid duplicate Uvicorn access filtering across Application instances."""

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
    LongLink(FastAPI())
    LongLink(FastAPI())

    # Assert
    assert sum(isinstance(item, ApiAccessFilter) for item in access_logger.filters) == 1


@pytest.mark.parametrize(
    ("relative_path", "content", "expected_metadata"),
    [
        pytest.param(
            "index.xml",
            "<longlink>Home</longlink>",
            {"tab": "index", "route": "/"},
            id="index",
        ),
        pytest.param(
            "dashboard.xml",
            '<longlink name="Dashboard" icon="layout-dashboard">Dashboard</longlink>',
            {"tab": "dashboard", "route": "/dashboard", "name": "Dashboard", "icon": "layout-dashboard"},
            id="root",
        ),
        pytest.param(
            "admin/users.xml",
            "<longlink>Users</longlink>",
            {"tab": "admin/users", "route": "/admin/users"},
            id="nested",
        ),
        pytest.param(
            "issues/[issue].xml",
            '<longlink name="Issue">Issue</longlink>',
            {"tab": "issues", "route": "/issues/:issue", "name": "Issue"},
            id="dynamic",
        ),
    ],
)
def test_xml_views_are_registered_from_default_views_directory(
    application_source: Path,
    relative_path: str,
    content: str,
    expected_metadata: dict[str, str],
) -> None:
    """Expose root, nested, and dynamic XML views with derived metadata."""

    # Build the default view tree.
    view_path = application_source / "views" / relative_path
    view_path.parent.mkdir(parents=True, exist_ok=True)
    view_path.write_text(content, encoding="utf-8")

    # Start LongLink and request the registered view and view catalog.
    client = create_runtime_client()
    response = client.get(f"/views/{relative_path.removesuffix('.xml')}")
    views_response = client.get("/views.json")

    # Verify content and metadata came from the default view tree.
    assert response.status_code == 200
    assert "application/xml" in response.headers["content-type"]
    assert response.text == content
    assert views_response.json() == [{"path": f"views/{relative_path.removesuffix('.xml')}", **expected_metadata}]


def test_xml_view_catalog_omits_blank_display_metadata(application_source: Path) -> None:
    """Normalize whitespace-only XML view metadata out of the public catalog."""

    # Arrange
    (application_source / "views" / "dashboard.xml").write_text(
        '<longlink name="  " icon="\t">Dashboard</longlink>',
        encoding="utf-8",
    )
    client = create_runtime_client()

    # Act
    response = client.get("/views.json")

    # Assert
    assert response.status_code == 200
    assert response.json() == [{"path": "views/dashboard", "route": "/dashboard", "tab": "dashboard"}]


def test_xml_view_catalog_uses_deterministic_path_order(application_source: Path) -> None:
    """Use lexical view paths for catalog output."""

    # Arrange
    nested_directory = application_source / "views" / "admin"
    nested_directory.mkdir()
    (nested_directory / "alpha.xml").write_text("<longlink>Alpha</longlink>", encoding="utf-8")
    (application_source / "views" / "zebra.xml").write_text("<longlink>Zebra</longlink>", encoding="utf-8")
    client = create_runtime_client()

    # Act
    catalog_response = client.get("/views.json")
    root_response = client.get("/", follow_redirects=False)

    # Assert
    assert catalog_response.status_code == 200
    assert catalog_response.json() == [
        {"path": "views/admin/alpha", "route": "/admin/alpha", "tab": "admin/alpha"},
        {"path": "views/zebra", "route": "/zebra", "tab": "zebra"},
    ]
    assert root_response.status_code == 307
    assert root_response.headers["location"] == "/admin/alpha"


def test_invalid_xml_view_fails_during_registration(application_source: Path) -> None:
    """Validate SDK XML views against the bundled schema before registering routes."""

    # Create a valid view alongside an invalid catalog entry.
    (application_source / "views" / "valid.xml").write_text("<longlink>Valid</longlink>", encoding="utf-8")
    (application_source / "views" / "broken.xml").write_text("<unknown />", encoding="utf-8")
    app = FastAPI()

    # Reject the complete catalog before registering valid view endpoints.
    with pytest.raises(ValueError, match="XML is invalid"):
        LongLink(app)

    # Assert
    assert not any(getattr(route, "path", None) == "/views/valid" for route in app.router.routes)


@pytest.mark.parametrize(
    ("route", "expected_dashboard_routes"),
    [
        pytest.param("/views/dashboard", 1, id="static-route"),
        pytest.param("/views/{view}", 0, id="dynamic-route"),
    ],
)
def test_application_routes_colliding_with_view_endpoints_are_rejected(
    application_source: Path,
    route: str,
    expected_dashboard_routes: int,
) -> None:
    """Reject view endpoints that would overlap an Application-owned route."""

    # Create a view whose endpoint is already owned by the Application.
    (application_source / "views" / "dashboard.xml").write_text(
        "<longlink>Dashboard</longlink>",
        encoding="utf-8",
    )
    app = FastAPI()

    @app.get(route)
    async def application_dashboard() -> dict[str, str]:
        """Return the Application dashboard resource."""

        return {"source": "application"}

    # Reject ambiguous ownership during runtime registration.
    with pytest.raises(ValueError, match="overlaps an Application route"):
        LongLink(app)

    # Assert LongLink did not register the colliding view endpoint.
    assert sum(getattr(item, "path", None) == "/views/dashboard" for item in app.router.routes) == expected_dashboard_routes


@pytest.mark.parametrize(
    ("first_view", "second_view", "message"),
    [
        pytest.param(
            "issues/[id].xml",
            "issues/[issue_id].xml",
            "Browser route '/issues/:issue_id' is already registered",
            id="dynamic",
        ),
        pytest.param("index.xml", "index/index.xml", "Browser route '/' is already registered", id="static"),
    ],
)
def test_duplicate_browser_routes_are_rejected(
    application_source: Path,
    first_view: str,
    second_view: str,
    message: str,
) -> None:
    """Reject distinct view files that resolve to one browser route."""

    # Arrange
    first_path = application_source / "views" / first_view
    second_path = application_source / "views" / second_view
    first_path.parent.mkdir(parents=True, exist_ok=True)
    second_path.parent.mkdir(parents=True, exist_ok=True)
    first_path.write_text("<longlink>First</longlink>", encoding="utf-8")
    second_path.write_text("<longlink>Second</longlink>", encoding="utf-8")

    app = FastAPI()

    # Act and assert
    with pytest.raises(ValueError, match=message):
        LongLink(app)

    # Assert
    assert not any(getattr(route, "path", "").startswith("/views/") for route in app.router.routes)
