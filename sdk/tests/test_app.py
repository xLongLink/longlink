import json
import pytest
from pytest import MonkeyPatch
from fastapi import FastAPI
from pathlib import Path
from longlink.app import LongLink
from fastapi.testclient import TestClient


def test_longlink_app_serves_runtime_routes_frontend_and_development_cors(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Serve SDK runtime endpoints, frontend entrypoint, and local development CORS."""

    # Create the required generated Application source layout.
    (tmp_path / "src" / "i18n").mkdir(parents=True)
    (tmp_path / "src" / "pages").mkdir()
    monkeypatch.chdir(tmp_path)

    # Initialize the development runtime and its in-process client.
    app = FastAPI()
    LongLink(app, env="development")
    client = TestClient(app)

    # Exercise runtime metadata, frontend fallback, and development preflight routes.
    pages_response = client.get("/pages.json")
    frontend_response = client.get("/")
    frontend_route_response = client.get("/settings", headers={"accept": "text/html"})
    cors_response = client.options(
        "/pages.json",
        headers={
            "origin": "http://localhost:5173",
            "access-control-request-method": "GET",
        },
    )

    # Verify each route and the local development CORS policy.
    assert pages_response.status_code == 200
    assert frontend_response.status_code == 200
    assert "text/html" in frontend_response.headers["content-type"]
    assert frontend_route_response.status_code == 200
    assert "text/html" in frontend_route_response.headers["content-type"]
    assert cors_response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_production_health_and_root_are_served_without_sdk_auth(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Serve runtime health and the app shell without SDK-owned authorization."""

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

    # Request the public health endpoint and frontend shell.
    health_response = client.get("/health")
    root_response = client.get("/")

    # Verify both resources remain publicly available.
    assert health_response.status_code == 200
    assert health_response.json() == {"ok": True}
    assert root_response.status_code == 200


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
