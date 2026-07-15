import json
import pytest
from pytest import MonkeyPatch
from pathlib import Path
from longlink.app import LongLink
from fastapi.testclient import TestClient
from longlink.utils.settings import Envs


def test_longlink_app_serves_runtime_routes_frontend_and_development_cors() -> None:
    """Serve SDK runtime endpoints, frontend entrypoint, and local development CORS."""

    app = LongLink(env=Envs(ENV="development"), i18n=None, pages=None)
    client = TestClient(app)

    pages_response = client.get("/pages.json")
    frontend_response = client.get("/")
    frontend_route_response = client.get("/settings")
    cors_response = client.options(
        "/pages.json",
        headers={
            "origin": "http://localhost:5173",
            "access-control-request-method": "GET",
        },
    )

    assert pages_response.status_code == 200
    assert frontend_response.status_code == 200
    assert "text/html" in frontend_response.headers["content-type"]
    assert frontend_route_response.status_code == 200
    assert "text/html" in frontend_route_response.headers["content-type"]
    assert cors_response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_production_health_and_root_are_served_without_sdk_auth() -> None:
    """Serve runtime health and the app shell without SDK-owned authorization."""

    client = TestClient(LongLink(env=Envs(ENV="production"), i18n=None, pages=None))

    health_response = client.get("/health")
    root_response = client.get("/")

    assert health_response.status_code == 200
    assert health_response.json() == {"ok": True}
    assert root_response.status_code == 200
    assert "text/html" in root_response.headers["content-type"]


@pytest.mark.parametrize(
    ("relative_path", "content", "expected_metadata"),
    [
        pytest.param(
            "dashboard.xml",
            '<longlink name="Dashboard" icon="layout-dashboard"><P i18n="dashboard.title" /></longlink>',
            {"tab": "dashboard", "route": "dashboard", "name": "Dashboard", "icon": "layout-dashboard"},
            id="root",
        ),
        pytest.param(
            "admin/users.xml",
            '<longlink><P i18n="users.title" /></longlink>',
            {"tab": "admin/users", "route": "admin/users"},
            id="nested",
        ),
        pytest.param(
            "issues/[issue].xml",
            '<longlink name="Issue"><P i18n="issues.title" /></longlink>',
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

    # Arrange
    page_path = tmp_path / "src" / "pages" / relative_path
    page_path.parent.mkdir(parents=True, exist_ok=True)
    page_path.write_text(content, encoding="utf-8")
    monkeypatch.chdir(tmp_path)

    # Act
    client = TestClient(LongLink())
    response = client.get(f"/pages/{relative_path}")
    pages_response = client.get("/pages.json")

    # Assert
    assert response.status_code == 200
    assert response.text == content
    pages = pages_response.json()
    page = next(item for item in pages if item["path"] == f"pages/{relative_path}")
    assert {key: page[key] for key in expected_metadata} == expected_metadata
    assert all("content" not in item for item in pages)


def test_invalid_xml_page_fails_during_registration(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Validate SDK XML pages against the bundled schema before registering routes."""

    page_path = tmp_path / "src" / "pages" / "broken.xml"
    page_path.parent.mkdir(parents=True, exist_ok=True)
    page_path.write_text("<unknown />", encoding="utf-8")
    monkeypatch.chdir(tmp_path)

    with pytest.raises(ValueError, match="XML is invalid"):
        LongLink()


def test_translation_catalog_is_served(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Expose the bundled translation catalog from the SDK application."""

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

    client = TestClient(LongLink())

    response = client.get("/i18n/en.json")

    assert response.status_code == 200
    assert response.json()["examples"]["text"]["title"] == "Localized text elements"


def test_sdk_runtime_has_no_login_or_permission_routes() -> None:
    """Keep login and permission routes out of the SDK runtime."""

    app = LongLink(env=Envs(ENV="testing"), i18n=None, pages=None)

    route_paths = {getattr(route, "path", "") for route in app.routes}

    assert not any(path == "/login" or path.startswith("/auth") for path in route_paths)
    assert not any("permission" in path for path in route_paths)
