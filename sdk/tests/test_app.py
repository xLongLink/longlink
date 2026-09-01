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

    # Register the generated page catalog before serving requests.
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
    pages_response = client.get("/pages.json")
    frontend_response = client.get("/", headers={"accept": "text/html"})

    # Assert
    assert pages_response.status_code == 200
    assert pages_response.json() == []
    assert frontend_response.status_code == 404


def test_production_startup_rejects_incomplete_runtime_settings(monkeypatch: MonkeyPatch) -> None:
    """Require every Platform-owned runtime setting before production startup."""

    # Ensure the production contract is incomplete.
    monkeypatch.setenv("LONGLINK_ENV", "production")
    monkeypatch.delenv("LONGLINK_DATABASE_HOST", raising=False)

    # Reject startup before the application begins serving requests.
    with pytest.raises(ValidationError, match="DATABASE_HOST"):
        LongLink(FastAPI())


def test_startup_rejects_a_missing_application_pages_directory(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    """Require the generated Application page directory during startup."""

    # Arrange
    monkeypatch.chdir(tmp_path)

    # Act and assert
    with pytest.raises(ValueError, match=f"Application source directory is required: {tmp_path / 'src' / 'pages'}"):
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
def test_xml_pages_are_registered_from_default_pages_directory(
    application_source: Path,
    relative_path: str,
    content: str,
    expected_metadata: dict[str, str],
) -> None:
    """Expose root, nested, and dynamic XML pages with derived metadata."""

    # Build the default page tree.
    page_path = application_source / "pages" / relative_path
    page_path.parent.mkdir(parents=True, exist_ok=True)
    page_path.write_text(content, encoding="utf-8")

    # Start LongLink and request the registered page and page catalog.
    client = create_runtime_client()
    response = client.get(f"/pages/{relative_path.removesuffix('.xml')}")
    pages_response = client.get("/pages.json")

    # Verify content and metadata came from the default page tree.
    assert response.status_code == 200
    assert "application/xml" in response.headers["content-type"]
    assert response.text == content
    assert pages_response.json() == [{"path": f"pages/{relative_path.removesuffix('.xml')}", **expected_metadata}]


def test_xml_page_catalog_omits_blank_display_metadata(application_source: Path) -> None:
    """Normalize whitespace-only XML page metadata out of the public catalog."""

    # Arrange
    (application_source / "pages" / "dashboard.xml").write_text(
        '<longlink name="  " icon="\t">Dashboard</longlink>',
        encoding="utf-8",
    )
    client = create_runtime_client()

    # Act
    response = client.get("/pages.json")

    # Assert
    assert response.status_code == 200
    assert response.json() == [{"path": "pages/dashboard", "route": "/dashboard", "tab": "dashboard"}]


def test_xml_page_catalog_uses_deterministic_path_order(application_source: Path) -> None:
    """Use lexical page paths for catalog output."""

    # Arrange
    nested_directory = application_source / "pages" / "admin"
    nested_directory.mkdir()
    (nested_directory / "alpha.xml").write_text("<longlink>Alpha</longlink>", encoding="utf-8")
    (application_source / "pages" / "zebra.xml").write_text("<longlink>Zebra</longlink>", encoding="utf-8")
    client = create_runtime_client()

    # Act
    catalog_response = client.get("/pages.json")
    root_response = client.get("/", follow_redirects=False)

    # Assert
    assert catalog_response.status_code == 200
    assert catalog_response.json() == [
        {"path": "pages/admin/alpha", "route": "/admin/alpha", "tab": "admin/alpha"},
        {"path": "pages/zebra", "route": "/zebra", "tab": "zebra"},
    ]
    assert root_response.status_code == 307
    assert root_response.headers["location"] == "/admin/alpha"


def test_invalid_xml_page_fails_during_registration(application_source: Path) -> None:
    """Validate SDK XML pages against the bundled schema before registering routes."""

    # Create a valid page alongside an invalid catalog entry.
    (application_source / "pages" / "valid.xml").write_text("<longlink>Valid</longlink>", encoding="utf-8")
    (application_source / "pages" / "broken.xml").write_text("<unknown />", encoding="utf-8")
    app = FastAPI()

    # Reject the complete catalog before registering valid page endpoints.
    with pytest.raises(ValueError, match="XML is invalid"):
        LongLink(app)

    # Assert
    assert not any(getattr(route, "path", None) == "/pages/valid" for route in app.router.routes)


@pytest.mark.parametrize(
    ("route", "expected_dashboard_routes"),
    [
        pytest.param("/pages/dashboard", 1, id="static-route"),
        pytest.param("/pages/{page}", 0, id="dynamic-route"),
    ],
)
def test_application_routes_colliding_with_page_endpoints_are_rejected(
    application_source: Path,
    route: str,
    expected_dashboard_routes: int,
) -> None:
    """Reject page endpoints that would overlap an Application-owned route."""

    # Create a page whose endpoint is already owned by the Application.
    (application_source / "pages" / "dashboard.xml").write_text(
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

    # Assert LongLink did not register the colliding page endpoint.
    assert sum(getattr(item, "path", None) == "/pages/dashboard" for item in app.router.routes) == expected_dashboard_routes


@pytest.mark.parametrize(
    ("first_page", "second_page", "message"),
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
    first_page: str,
    second_page: str,
    message: str,
) -> None:
    """Reject distinct page files that resolve to one browser route."""

    # Arrange
    first_path = application_source / "pages" / first_page
    second_path = application_source / "pages" / second_page
    first_path.parent.mkdir(parents=True, exist_ok=True)
    second_path.parent.mkdir(parents=True, exist_ok=True)
    first_path.write_text("<longlink>First</longlink>", encoding="utf-8")
    second_path.write_text("<longlink>Second</longlink>", encoding="utf-8")

    app = FastAPI()

    # Act and assert
    with pytest.raises(ValueError, match=message):
        LongLink(app)

    # Assert
    assert not any(getattr(route, "path", "").startswith("/pages/") for route in app.router.routes)
