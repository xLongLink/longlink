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

    metadata_response = client.get("/metadata.json")
    frontend_response = client.get("/")
    frontend_route_response = client.get("/settings")
    cors_response = client.options(
        "/metadata.json",
        headers={
            "origin": "http://localhost:5173",
            "access-control-request-method": "GET",
        },
    )

    assert metadata_response.status_code == 200
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


def test_xml_pages_are_registered_from_default_pages_directory(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Expose XML pages from the default SDK pages directory."""

    page_path = tmp_path / "src" / "pages" / "dashboard.xml"
    page_path.parent.mkdir(parents=True, exist_ok=True)
    page_path.write_text(
        '<longlink name="Dashboard" icon="layout-dashboard"><P i18n="dashboard.title" /></longlink>',
        encoding="utf-8",
    )
    monkeypatch.chdir(tmp_path)

    client = TestClient(LongLink())

    response = client.get("/pages/dashboard.xml")
    metadata_response = client.get("/metadata.json")

    assert response.status_code == 200
    assert response.text == (
        '<longlink name="Dashboard" icon="layout-dashboard"><P i18n="dashboard.title" /></longlink>'
    )
    assert any(
        page["tab"] == "dashboard"
        and page["path"] == "pages/dashboard.xml"
        and page["route"] == "dashboard"
        and page["name"] == "Dashboard"
        and page["icon"] == "layout-dashboard"
        for page in metadata_response.json()["pages"]
    )
    assert all("content" not in page for page in metadata_response.json()["pages"])


def test_nested_xml_pages_are_registered_from_default_pages_directory(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Expose nested XML pages from the default SDK pages directory."""

    page_path = tmp_path / "src" / "pages" / "admin" / "users.xml"
    page_path.parent.mkdir(parents=True, exist_ok=True)
    page_path.write_text("<longlink><P i18n=\"users.title\" /></longlink>", encoding="utf-8")
    monkeypatch.chdir(tmp_path)

    client = TestClient(LongLink())

    response = client.get("/pages/admin/users.xml")
    metadata_response = client.get("/metadata.json")

    assert response.status_code == 200
    assert response.text == "<longlink><P i18n=\"users.title\" /></longlink>"
    assert {page["path"] for page in metadata_response.json()["pages"]} >= {"pages/admin/users.xml"}
    assert {page["tab"] for page in metadata_response.json()["pages"]} >= {"admin/users"}
    assert {page["route"] for page in metadata_response.json()["pages"]} >= {"admin/users"}
    assert all("content" not in page for page in metadata_response.json()["pages"])


def test_dynamic_xml_pages_derive_routes_and_tabs(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Expose `[parameter].xml` files as dynamic browser route metadata."""

    page_path = tmp_path / "src" / "pages" / "issues" / "[issue].xml"
    page_path.parent.mkdir(parents=True, exist_ok=True)
    page_path.write_text('<longlink name="Issue"><P i18n="issues.title" /></longlink>', encoding="utf-8")
    monkeypatch.chdir(tmp_path)

    client = TestClient(LongLink())

    response = client.get("/pages/issues/[issue].xml")
    metadata_response = client.get("/metadata.json")

    assert response.status_code == 200
    assert any(
        page["tab"] == "issues"
        and page["path"] == "pages/issues/[issue].xml"
        and page["route"] == "issues/:issue"
        for page in metadata_response.json()["pages"]
    )


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
