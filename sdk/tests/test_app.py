import json
import pytest
from pytest import MonkeyPatch
from fastapi import FastAPI
from pathlib import Path
from pydantic import ValidationError
from longlink.app import LongLink
from fastapi.testclient import TestClient


@pytest.fixture
def application_source(monkeypatch: MonkeyPatch, tmp_path: Path) -> Path:
    """Create the minimum generated Application source layout."""

    # Create the source directories required by the runtime.
    source_directory = tmp_path / "src"
    (source_directory / "i18n").mkdir(parents=True)
    (source_directory / "pages").mkdir()
    monkeypatch.chdir(tmp_path)

    return source_directory


def test_longlink_app_serves_runtime_routes_and_frontend(application_source: Path) -> None:
    """Serve SDK runtime endpoints and the embedded frontend."""

    # Initialize the development runtime and its in-process client.
    app = FastAPI()
    LongLink(app, env="development")
    client = TestClient(app)

    # Exercise runtime metadata and frontend fallback routes.
    pages_response = client.get("/pages.json")
    frontend_response = client.get("/")
    frontend_route_response = client.get("/settings", headers={"accept": "text/html"})
    # Verify each runtime route.
    assert pages_response.status_code == 200
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


def test_production_health_is_served_without_sdk_auth(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Serve the runtime health endpoint without SDK-owned authorization."""

    # Create the complete Platform runtime contract and generated source layout.
    for name, value in {
        "LONGLINK_DATABASE_HOST": "db",
        "LONGLINK_DATABASE_NAME": "longlink",
        "LONGLINK_DATABASE_PORT": "5432",
        "LONGLINK_DATABASE_SCHEMA": "application",
        "LONGLINK_DATABASE_PASSWORD": "secret",
        "LONGLINK_DATABASE_USERNAME": "app",
        "LONGLINK_STORAGE_BUCKET": "organization",
        "LONGLINK_STORAGE_PREFIX": "applications/application",
        "LONGLINK_STORAGE_REGION": "region",
        "LONGLINK_STORAGE_PASSWORD": "secret",
        "LONGLINK_STORAGE_USERNAME": "key",
        "LONGLINK_STORAGE_ENDPOINT_URL": "https://storage.example.com",
    }.items():
        monkeypatch.setenv(name, value)
    (tmp_path / "src" / "i18n").mkdir(parents=True)
    (tmp_path / "src" / "pages").mkdir()
    monkeypatch.chdir(tmp_path)

    # Start the production runtime without SDK authentication dependencies.
    app = FastAPI()
    LongLink(app, env="production")
    client = TestClient(app)

    # Request the public health endpoint.
    health_response = client.get("/health")

    # Verify the health endpoint remains publicly available.
    assert health_response.status_code == 200
    assert health_response.json() == {"ok": True}


@pytest.mark.parametrize(
    ("relative_path", "content", "expected_metadata"),
    [
        pytest.param(
            "index.xml",
            '<longlink version="v1"><Text i18n="home.title" /></longlink>',
            {"tab": "index", "route": ""},
            id="index",
        ),
        pytest.param(
            "dashboard.xml",
            '<longlink version="v1" name="Dashboard" icon="layout-dashboard"><Text i18n="dashboard.title" /></longlink>',
            {"tab": "dashboard", "route": "dashboard", "name": "Dashboard", "icon": "layout-dashboard"},
            id="root",
        ),
        pytest.param(
            "admin/users.xml",
            '<longlink version="v1"><Text i18n="users.title" /></longlink>',
            {"tab": "admin/users", "route": "admin/users"},
            id="nested",
        ),
        pytest.param(
            "issues/[issue].xml",
            '<longlink version="v1" name="Issue"><Text i18n="issues.title" /></longlink>',
            {"tab": "issues", "route": "issues/:issue"},
            id="dynamic",
        ),
    ],
)
def test_xml_pages_are_registered_from_default_pages_directory(
    monkeypatch: MonkeyPatch,
    tmp_path: Path,
    relative_path: str,
    content: str,
    expected_metadata: dict[str, str],
) -> None:
    """Expose root, nested, and dynamic XML pages with derived metadata."""

    # Build the default page tree.
    page_path = tmp_path / "src" / "pages" / relative_path
    page_path.parent.mkdir(parents=True, exist_ok=True)
    page_path.write_text(content, encoding="utf-8")
    (tmp_path / "src" / "i18n").mkdir()
    monkeypatch.chdir(tmp_path)

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
    assert all("content" not in item for item in pages)


def test_invalid_xml_page_fails_during_registration(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Validate SDK XML pages against the bundled schema before registering routes."""

    # Create an invalid page in the default Application page directory.
    page_path = tmp_path / "src" / "pages" / "broken.xml"
    page_path.parent.mkdir(parents=True, exist_ok=True)
    page_path.write_text("<unknown />", encoding="utf-8")
    (tmp_path / "src" / "i18n").mkdir()
    monkeypatch.chdir(tmp_path)

    # Start registration and require schema validation to fail immediately.
    with pytest.raises(ValueError, match="XML is invalid"):
        LongLink(FastAPI())


def test_application_route_collision_with_page_endpoint_is_rejected(
    application_source: Path,
) -> None:
    """Reject page endpoints that would overlap an Application-owned route."""

    # Create a page whose endpoint is already owned by the Application.
    (application_source / "pages" / "dashboard.xml").write_text(
        '<longlink version="v1"><Text i18n="dashboard.title" /></longlink>',
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


def test_translation_catalog_is_served(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Expose the bundled translation catalog from the SDK application."""

    # Create an Application translation catalog in the default source tree.
    catalog_path = tmp_path / "src" / "i18n" / "en.json"
    catalog_path.parent.mkdir(parents=True, exist_ok=True)
    catalog_path.write_text(
        json.dumps(
            {
                "examples": {
                    "text": {
                        "title": "Localized text elements",
                    }
                }
            }
        ),
        encoding="utf-8",
    )
    (tmp_path / "src" / "pages").mkdir()
    monkeypatch.chdir(tmp_path)

    # Request the catalog through the initialized SDK runtime.
    app = FastAPI()
    LongLink(app)
    client = TestClient(app)
    response = client.get("/i18n/en.json")

    # Verify the source catalog is returned unchanged.
    assert response.status_code == 200
    assert response.json()["examples"]["text"]["title"] == "Localized text elements"
