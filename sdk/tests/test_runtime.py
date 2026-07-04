from types import SimpleNamespace
from pathlib import Path
from pydantic import Field
from longlink.app import LongLink
from longlink.pages import (page_file_tab, page_file_route,
                            normalize_page_path, extract_longlink_metadata)
from fastapi.testclient import TestClient
from longlink.utils.metadata import load_metadata
from longlink.utils.settings import Envs
from longlink.utils.environments import Environments


def test_sdk_envs_read_longlink_prefixed_runtime_settings(monkeypatch) -> None:
    """Read SDK runtime settings from `LONGLINK_` process variables."""

    monkeypatch.setenv("ENV", "testing")
    monkeypatch.setenv("LONGLINK_ENV", "production")
    monkeypatch.setenv("LONGLINK_DATABASE_URL", "postgresql://app:secret@db/longlink")
    monkeypatch.setenv("LONGLINK_DATABASE_SCHEMA", "dashboard")
    monkeypatch.setenv("LONGLINK_STORAGE_BUCKET", "longlink-acme-dashboard")
    monkeypatch.setenv("LONGLINK_STORAGE_SHARED_BUCKET", "longlink-acme-shared")

    settings = Envs()

    assert settings.ENV == "production"
    assert settings.DATABASE_URL == "postgresql://app:secret@db/longlink"
    assert settings.DATABASE_SCHEMA == "dashboard"
    assert settings.STORAGE_BUCKET == "longlink-acme-dashboard"
    assert settings.STORAGE_SHARED_BUCKET == "longlink-acme-shared"


def test_app_environments_load_env_files_and_ignore_extra_keys(monkeypatch, tmp_path: Path) -> None:
    """Load app-defined `.env` and `.env.sample` values while ignoring undeclared keys."""

    class AppEnvironments(Environments):
        """Application-specific environment contract for tests."""

        api_key: str = Field(default="", validation_alias="API_KEY")
        sample_only: str = Field(default="", validation_alias="SAMPLE_ONLY")

    (tmp_path / ".env").write_text("API_KEY=from-env\nEXTRA_KEY=ignored\n", encoding="utf-8")
    (tmp_path / ".env.sample").write_text("API_KEY=from-sample\nSAMPLE_ONLY=sample\n", encoding="utf-8")
    monkeypatch.chdir(tmp_path)

    settings = AppEnvironments()

    assert settings.api_key == "from-sample"
    assert settings.sample_only == "sample"
    assert not hasattr(settings, "EXTRA_KEY")


def test_longlink_app_serves_runtime_routes_frontend_and_development_cors() -> None:
    """Serve SDK runtime endpoints, frontend entrypoint, and local development CORS."""

    app = LongLink(env=Envs(ENV="development"), i18n=None, pages=None)
    client = TestClient(app)

    metadata_response = client.get("/metadata.json")
    frontend_response = client.get("/")
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
    assert cors_response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_longlink_mounts_i18n_and_registers_xml_pages(monkeypatch, tmp_path: Path) -> None:
    """Mount app translations and register validated XML pages from source directories."""

    i18n_path = tmp_path / "src" / "i18n" / "en.json"
    page_path = tmp_path / "src" / "pages" / "dashboard.xml"
    i18n_path.parent.mkdir(parents=True)
    page_path.parent.mkdir(parents=True)
    i18n_path.write_text('{"dashboard":{"title":"Dashboard"}}', encoding="utf-8")
    page_path.write_text(
        '<longlink name="Dashboard" icon="layout-dashboard"><P i18n="dashboard.title" /></longlink>',
        encoding="utf-8",
    )
    monkeypatch.chdir(tmp_path)

    app = LongLink(env=Envs(ENV="production"))
    page = app.state.page_registry[0]
    client = TestClient(app)

    assert page.path == "/pages/dashboard.xml"
    assert page.route == "dashboard"
    assert page.tab == "dashboard"
    assert page.name == "Dashboard"
    assert page.icon == "layout-dashboard"
    assert client.get("/i18n/en.json").json() == {"dashboard": {"title": "Dashboard"}}
    assert client.get("/pages/dashboard.xml").text == page_path.read_text(encoding="utf-8")


def test_metadata_loading_and_runtime_metadata_endpoint(monkeypatch, tmp_path: Path) -> None:
    """Load app metadata from LongLink and PEP 621 pyproject sections."""

    pyproject_path = tmp_path / "pyproject.toml"
    pyproject_path.write_text(
        "\n".join(
            [
                "[project]",
                'name = "pep-app"',
                'version = "1.2.3"',
                'description = "PEP app description"',
                "",
                "[tool.longlink]",
                'name = "longlink-app"',
                'title = "Operations Console"',
                'summary = "Ops summary"',
            ]
        ),
        encoding="utf-8",
    )
    monkeypatch.chdir(tmp_path)

    metadata = load_metadata(pyproject_path)
    app = LongLink(env=Envs(ENV="production"), i18n=None, pages=None)
    app.state.page_registry.append(
        SimpleNamespace(
            path="/pages/dashboard.xml",
            route="dashboard",
            tab="dashboard",
            name="Dashboard",
            icon="layout-dashboard",
        )
    )
    client = TestClient(app)

    assert metadata.name == "longlink-app"
    assert metadata.title == "Operations Console"
    assert metadata.summary == "Ops summary"
    assert metadata.description == "PEP app description"
    assert metadata.version == "1.2.3"
    assert client.get("/metadata.json").json() == {
        "name": "longlink-app",
        "title": "Operations Console",
        "summary": "Ops summary",
        "description": "PEP app description",
        "version": "1.2.3",
        "pages": [
            {
                "tab": "dashboard",
                "path": "pages/dashboard.xml",
                "route": "dashboard",
                "name": "Dashboard",
                "icon": "layout-dashboard",
            }
        ],
    }


def test_page_metadata_helpers() -> None:
    """Normalize page routes and parse page navigation metadata."""

    assert normalize_page_path("pages/dashboard.xml") == "/pages/dashboard.xml"
    assert page_file_route("index.xml") == ""
    assert page_file_route("issues/[issue].xml") == "issues/:issue"
    assert page_file_route("issues/[issue]/comments.xml") == "issues/:issue/comments"
    assert page_file_tab("admin/users.xml") == "admin/users"
    assert page_file_tab("issues/[issue].xml") == "issues"
    assert page_file_tab("[issue].xml") == "issue"
    assert extract_longlink_metadata(
        '<longlink name=" Dashboard " icon=" layout-dashboard "><P i18n="dashboard.title" /></longlink>'
    ) == ("Dashboard", "layout-dashboard")
    assert extract_longlink_metadata("<unknown />") == (None, None)
