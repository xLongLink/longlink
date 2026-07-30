import json
import pytest
from pytest import MonkeyPatch
from pathlib import Path
from longlink.app import LongLink
from fastapi.testclient import TestClient
from longlink.utils.settings import Envs


def test_longlink_app_serves_runtime_routes_frontend_and_development_cors() -> None:
    """Serve SDK runtime endpoints, frontend entrypoint, and local development CORS."""

    # Initialize the development runtime and its in-process client.
    app = LongLink(env=Envs(ENV="development"), i18n=None, pages=None)
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


def test_production_health_and_root_are_served_without_sdk_auth() -> None:
    """Serve runtime health and the app shell without SDK-owned authorization."""

    # Start the production runtime without SDK authentication dependencies.
    client = TestClient(LongLink(env=Envs(ENV="production"), i18n=None, pages=None))

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
            '<longlink><Text i18n="home.title" /></longlink>',
            {"tab": "index", "route": ""},
            id="index",
        ),
        pytest.param(
            "dashboard.xml",
            '<longlink name="Dashboard" icon="layout-dashboard"><Text i18n="dashboard.title" /></longlink>',
            {"tab": "dashboard", "route": "dashboard", "name": "Dashboard", "icon": "layout-dashboard"},
            id="root",
        ),
        pytest.param(
            "admin/users.xml",
            '<longlink><Text i18n="users.title" /></longlink>',
            {"tab": "admin/users", "route": "admin/users"},
            id="nested",
        ),
        pytest.param(
            "issues/[issue].xml",
            '<longlink name="Issue"><Text i18n="issues.title" /></longlink>',
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

    # Build the default page tree and an alternate page that must be ignored.
    page_path = tmp_path / "src" / "pages" / relative_path
    page_path.parent.mkdir(parents=True, exist_ok=True)
    page_path.write_text(content, encoding="utf-8")
    alternate_path = tmp_path / "alternate.xml"
    alternate_path.write_text("<longlink><Text>Alternate</Text></longlink>", encoding="utf-8")
    monkeypatch.chdir(tmp_path)

    # Start LongLink and request the registered page and page catalog.
    client = TestClient(LongLink())
    response = client.get(f"/pages/{relative_path}", params={"page_path": str(alternate_path)})
    pages_response = client.get("/pages.json")

    # Verify content and metadata came from the default page tree.
    assert response.status_code == 200
    assert response.text == content
    pages = pages_response.json()
    page = next(item for item in pages if item["path"] == f"pages/{relative_path}")
    assert {key: page[key] for key in expected_metadata} == expected_metadata
    assert all("content" not in item for item in pages)


def test_invalid_xml_page_fails_during_registration(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Validate SDK XML pages against the bundled schema before registering routes."""

    # Create an invalid page in the default Application page directory.
    page_path = tmp_path / "src" / "pages" / "broken.xml"
    page_path.parent.mkdir(parents=True, exist_ok=True)
    page_path.write_text("<unknown />", encoding="utf-8")
    monkeypatch.chdir(tmp_path)

    # Start registration and require schema validation to fail immediately.
    with pytest.raises(ValueError, match="XML is invalid"):
        LongLink()


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
    monkeypatch.chdir(tmp_path)

    # Request the catalog through the initialized SDK runtime.
    client = TestClient(LongLink())
    response = client.get("/i18n/en.json")

    # Verify the source catalog is returned unchanged.
    assert response.status_code == 200
    assert response.json()["examples"]["text"]["title"] == "Localized text elements"
