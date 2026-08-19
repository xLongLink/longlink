import pytest
from pytest import MonkeyPatch
from fastapi import FastAPI
from pathlib import Path
from pydantic import ValidationError
from longlink.app import LongLink
from fastapi.testclient import TestClient


def test_longlink_app_serves_runtime_routes_and_frontend(application_source: Path) -> None:
    """Serve SDK runtime endpoints and the embedded frontend."""

    # Initialize the development runtime and its in-process client.
    app = FastAPI()
    LongLink(app, env="development")
    client = TestClient(app)

    # Exercise runtime metadata and frontend fallback routes.
    frontend_response = client.get("/")
    frontend_route_response = client.get("/settings", headers={"accept": "text/html"})
    # Verify each runtime route.
    assert frontend_response.status_code == 200
    assert "text/html" in frontend_response.headers["content-type"]
    assert frontend_route_response.status_code == 200
    assert "text/html" in frontend_route_response.headers["content-type"]


def test_production_startup_rejects_incomplete_runtime_settings(monkeypatch: MonkeyPatch) -> None:
    """Require every Platform-owned runtime setting before production startup."""

    # Ensure the production contract is incomplete.
    monkeypatch.setenv("LONGLINK_ENV", "production")
    monkeypatch.delenv("LONGLINK_DATABASE_HOST", raising=False)

    # Reject startup before the application begins serving requests.
    with pytest.raises(ValidationError, match="DATABASE_HOST"):
        LongLink(FastAPI())


@pytest.mark.parametrize(
    ("relative_path", "content", "expected_metadata"),
    [
        pytest.param(
            "index.xml",
            '<longlink>Home</longlink>',
            {"tab": "index", "route": ""},
            id="index",
        ),
        pytest.param(
            "dashboard.xml",
            '<longlink name="Dashboard" icon="layout-dashboard">Dashboard</longlink>',
            {"tab": "dashboard", "route": "dashboard", "name": "Dashboard", "icon": "layout-dashboard"},
            id="root",
        ),
        pytest.param(
            "admin/users.xml",
            '<longlink>Users</longlink>',
            {"tab": "admin/users", "route": "admin/users"},
            id="nested",
        ),
        pytest.param(
            "issues/[issue].xml",
            '<longlink name="Issue">Issue</longlink>',
            {"tab": "issues", "route": "issues/:issue"},
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
    app = FastAPI()
    LongLink(app)
    client = TestClient(app)
    page_path_without_suffix = relative_path.removesuffix(".xml")
    response = client.get(f"/pages/{page_path_without_suffix}")
    pages_response = client.get("/pages.json")

    # Verify content and metadata came from the default page tree.
    assert response.status_code == 200
    assert response.text == content
    pages = pages_response.json()
    page = next(item for item in pages if item["path"] == f"pages/{page_path_without_suffix}")
    assert {key: page[key] for key in expected_metadata} == expected_metadata


def test_invalid_xml_page_fails_during_registration(application_source: Path) -> None:
    """Validate SDK XML pages against the bundled schema before registering routes."""

    # Create an invalid page in the default Application page directory.
    page_path = application_source / "pages" / "broken.xml"
    page_path.parent.mkdir(parents=True, exist_ok=True)
    page_path.write_text("<unknown />", encoding="utf-8")

    # Start registration and require schema validation to fail immediately.
    with pytest.raises(ValueError, match="XML is invalid"):
        LongLink(FastAPI())


def test_application_route_collision_with_page_endpoint_is_rejected(
    application_source: Path,
) -> None:
    """Reject page endpoints that would overlap an Application-owned route."""

    # Create a page whose endpoint is already owned by the Application.
    (application_source / "pages" / "dashboard.xml").write_text(
        '<longlink>Dashboard</longlink>',
        encoding="utf-8",
    )
    app = FastAPI()

    @app.get("/pages/dashboard")
    async def application_dashboard() -> dict[str, str]:
        """Return the Application dashboard resource."""

        return {"source": "application"}

    # Reject ambiguous ownership during runtime registration.
    with pytest.raises(ValueError, match="overlaps an Application route"):
        LongLink(app)
