import pytest
import tomllib
import longlink
from types import SimpleNamespace
from typing import Any
from pathlib import Path
from pydantic import Field
from longlink.app import LongLink
from longlink.pages import normalize_page_path, extract_longlink_metadata
from longlink.router import Router
from starlette.routing import Mount, Route
from starlette.requests import Request
from longlink.utils.metadata import load_metadata
from longlink.utils.settings import Envs
from longlink.routes.metadata import get_metadata
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware
from longlink.utils.environments import Environments


def test_sdk_exports_runtime_objects() -> None:
    """Export the SDK app, router, helpers, and import-time runtime objects."""

    exported_names = set(longlink.__all__)

    assert {
        "LongLink",
        "Router",
        "User",
        "Element",
        "Longlink",
        "Envs",
        "Environments",
        "create_db",
        "create_fs",
        "create_shared_fs",
        "db",
        "env",
        "fs",
        "shared_fs",
    } <= exported_names
    assert isinstance(longlink.env, Envs)
    assert longlink.db is not None
    assert longlink.fs is not None
    assert longlink.shared_fs is not None


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


def test_sdk_package_metadata_includes_static_assets_and_python_requirement() -> None:
    """Package static web/XSD assets and require the supported Python version."""

    pyproject = tomllib.loads((Path(__file__).parents[1] / "pyproject.toml").read_text(encoding="utf-8"))
    package_root = Path(longlink.__file__).parent

    assert pyproject["project"]["requires-python"] == ">=3.14"
    assert pyproject["tool"]["setuptools"]["package-data"]["longlink"] == [".static/**"]
    assert (package_root / ".static" / "web" / "index.html").exists()
    assert (package_root / ".static" / "xsd" / "schema.xsd").exists()


def test_longlink_app_installs_runtime_routes_frontend_audit_and_cors() -> None:
    """Build the SDK FastAPI app with runtime routes, frontend assets, audit middleware, and dev CORS."""

    app = LongLink(env=Envs(ENV="development"), i18n=None, pages=None)
    middleware_by_class: dict[type[Any], dict[str, Any]] = {}
    for middleware in app.user_middleware:
        assert isinstance(middleware.cls, type)
        middleware_by_class[middleware.cls] = dict(middleware.kwargs)

    route_paths = {getattr(route, "path", None) for route in app.routes}
    frontend_route = next(route for route in app.routes if getattr(route, "path", None) == "/")
    assert isinstance(frontend_route, Route)
    frontend_response = frontend_route.endpoint()

    assert Path(frontend_response.path).name == "index.html"
    assert any(route.__class__.__name__ == "_IncludedRouter" for route in app.routes)
    assert "/" in route_paths
    assert "/assets" in route_paths
    assert BaseHTTPMiddleware in middleware_by_class
    assert middleware_by_class[BaseHTTPMiddleware]["dispatch"].__name__ == "audit_context_middleware"
    assert middleware_by_class[CORSMiddleware]["allow_origins"] == [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
    ]


@pytest.mark.asyncio
async def test_longlink_mounts_i18n_and_registers_xml_pages(monkeypatch, tmp_path: Path) -> None:
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
    mounted_routes = {getattr(route, "path", None): route for route in app.routes}
    page = app.state.page_registry[0]
    i18n_route = mounted_routes["/i18n"]
    assert isinstance(i18n_route, Mount)

    assert "/i18n" in mounted_routes
    assert getattr(i18n_route.app, "directory") == i18n_path.parent
    assert page.path == "/pages/dashboard.xml"
    assert page.name == "Dashboard"
    assert page.icon == "layout-dashboard"
    assert await page.handler() == page_path.read_text(encoding="utf-8")


@pytest.mark.asyncio
async def test_metadata_loading_and_runtime_metadata_endpoint(monkeypatch, tmp_path: Path) -> None:
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
            name="Dashboard",
            icon="layout-dashboard",
        )
    )
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/metadata.json",
            "headers": [],
            "query_string": b"",
            "app": app,
        }
    )

    assert metadata.name == "longlink-app"
    assert metadata.title == "Operations Console"
    assert metadata.summary == "Ops summary"
    assert metadata.description == "PEP app description"
    assert metadata.version == "1.2.3"
    assert await get_metadata(request) == {
        "name": "longlink-app",
        "title": "Operations Console",
        "summary": "Ops summary",
        "description": "PEP app description",
        "version": "1.2.3",
        "pages": [
            {
                "tab": "dashboard",
                "path": "pages/dashboard.xml",
                "name": "Dashboard",
                "icon": "layout-dashboard",
            }
        ],
    }


def test_page_metadata_helpers_and_router_compatibility() -> None:
    """Normalize page routes, parse page navigation metadata, and preserve APIRouter methods."""

    router = Router()

    assert normalize_page_path("pages/dashboard.xml") == "/pages/dashboard.xml"
    assert extract_longlink_metadata(
        '<longlink name=" Dashboard " icon=" layout-dashboard "><P i18n="x" /></longlink>'
    ) == ("Dashboard", "layout-dashboard")
    assert extract_longlink_metadata("<unknown />") == (None, None)
    assert hasattr(router, "add_api_route")
    assert hasattr(router, "include_router")
    assert not hasattr(router, "page")
