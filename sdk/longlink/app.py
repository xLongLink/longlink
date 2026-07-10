import logging
from typing import Any
from fastapi import FastAPI, APIRouter
from pathlib import Path
from longlink.pages import (XMLResponse, PageDefinition, page_file_tab,
                            page_file_route, normalize_page_path,
                            extract_longlink_metadata)
from longlink.utils import Envs
from collections.abc import Callable
from longlink.routes import routes
from longlink.logger import ApiAccessFilter
from pydantic_settings import BaseSettings
from longlink.constants import ROOT
from longlink.utils.xml import Longlink as LonglinkXml
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from longlink.database.audit import install_audit_middleware

API_PREFIX = "/api"
RouteDecorator = Callable[[Callable[..., Any]], Callable[..., Any]]


def normalize_mount_path(path: str) -> str:
    """Normalize an SDK-managed mount path."""

    normalized_path = path.strip()

    # Blank mount paths cannot be routed.
    if not normalized_path:
        raise ValueError("Mount path is required")

    # Mount paths are stored as absolute routes.
    if not normalized_path.startswith("/"):
        normalized_path = f"/{normalized_path}"

    return normalized_path.rstrip("/") or "/"


def default_source_directory(route_path: str) -> Path:
    """Return the default source directory for one SDK-managed route path."""

    source_directory = (Path.cwd() / "src").resolve()
    route_directory = (source_directory / normalize_mount_path(route_path).strip("/")).resolve()

    # Prevent mounts from escaping the application source tree.
    if not route_directory.is_relative_to(source_directory):
        raise ValueError("Mount path must stay inside the src directory")

    return route_directory


def user_api_path(path: str) -> str:
    """Return a user API path under the SDK API prefix."""

    normalized_path = normalize_mount_path(path)

    # Preserve paths already scoped to the API prefix.
    if normalized_path == API_PREFIX or normalized_path.startswith(f"{API_PREFIX}/"):
        return normalized_path

    # The root API path maps directly to the API prefix.
    if normalized_path == "/":
        return API_PREFIX

    return f"{API_PREFIX}{normalized_path}"


def user_router_prefix(prefix: str) -> str:
    """Return the include-router prefix for user-defined API routes."""

    # Empty router prefixes attach at the API root.
    if not prefix:
        return API_PREFIX

    return user_api_path(prefix)


class LongLink(FastAPI):
    """FastAPI app that owns SDK service creation and shared request state."""

    def __init__(
        self,
        env: BaseSettings | None = None,
        i18n: str | None = "/i18n",
        pages: str | None = "/pages",
        **kwargs: Any,
    ) -> None:
        """Build app, initialize managed services, mount routes, and serve the frontend."""
        super().__init__(**kwargs)

        environments = env if isinstance(env, Envs) else Envs()
        page_registry: list[PageDefinition] = []
        self.state.page_registry = page_registry

        # Production containers attach API access filtering here.
        if environments.ENV == "production":

            # Built app containers run plain uvicorn, so attach the SDK access filter here.
            access_logger = logging.getLogger("uvicorn.access")

            # Avoid installing the access filter more than once.
            if not any(isinstance(item, ApiAccessFilter) for item in access_logger.filters):
                access_logger.addFilter(ApiAccessFilter())

        # Mount SDK-managed routes before user-facing assets.
        for router in routes:
            super().include_router(router)

        install_audit_middleware(self)

        frontend_directory = ROOT / ".static" / "web"

        # Optional translation mounts can be disabled.
        if i18n is not None:
            i18n_path = normalize_mount_path(i18n)
            translations_directory = default_source_directory(i18n_path)

            # Serve the bundled translation catalog from the application itself.
            if translations_directory.exists():
                self.mount(i18n_path, StaticFiles(directory=translations_directory), name="translations")

        # Optional page discovery can be disabled.
        if pages is not None:
            pages_path = normalize_mount_path(pages)
            pages_directory = default_source_directory(pages_path)

            # Register pages only when the source directory exists.
            if pages_directory.exists():
                self.register_page_directory(pages_path, pages_directory)

        # Serve the embedded frontend when the bundle is available.
        if frontend_directory.exists():
            self.frontend("/", directory=frontend_directory)

        # Enable CORS in development for local frontend access to API routes
        if environments.ENV == "development":
            self.add_middleware(
                CORSMiddleware,
                allow_origins=[
                    "http://localhost:3000",
                    "http://localhost:5173",
                    "http://localhost:8000",
                ],
                allow_credentials=True,
                allow_methods=["*"],
                allow_headers=["*"],
            )


    def add_api_route(self, path: str, endpoint: Callable[..., Any], **kwargs: Any) -> None:
        """Register a user-defined route under `/api`."""

        return super().add_api_route(user_api_path(path), endpoint, **kwargs)


    def api_route(self, path: str, **kwargs: Any) -> RouteDecorator:
        """Return a user-defined route decorator under `/api`."""

        return super().api_route(user_api_path(path), **kwargs)


    def delete(self, path: str, **kwargs: Any) -> RouteDecorator:
        """Return a user-defined DELETE route decorator under `/api`."""

        return super().delete(user_api_path(path), **kwargs)


    def get(self, path: str, **kwargs: Any) -> RouteDecorator:
        """Return a user-defined GET route decorator under `/api`."""

        return super().get(user_api_path(path), **kwargs)


    def head(self, path: str, **kwargs: Any) -> RouteDecorator:
        """Return a user-defined HEAD route decorator under `/api`."""

        return super().head(user_api_path(path), **kwargs)


    def include_router(self, router: APIRouter, *, prefix: str = "", **kwargs: Any) -> None:
        """Include a user-defined router under `/api`."""

        return super().include_router(router, prefix=user_router_prefix(prefix), **kwargs)


    def options(self, path: str, **kwargs: Any) -> RouteDecorator:
        """Return a user-defined OPTIONS route decorator under `/api`."""

        return super().options(user_api_path(path), **kwargs)


    def patch(self, path: str, **kwargs: Any) -> RouteDecorator:
        """Return a user-defined PATCH route decorator under `/api`."""

        return super().patch(user_api_path(path), **kwargs)


    def post(self, path: str, **kwargs: Any) -> RouteDecorator:
        """Return a user-defined POST route decorator under `/api`."""

        return super().post(user_api_path(path), **kwargs)


    def put(self, path: str, **kwargs: Any) -> RouteDecorator:
        """Return a user-defined PUT route decorator under `/api`."""

        return super().put(user_api_path(path), **kwargs)


    def trace(self, path: str, **kwargs: Any) -> RouteDecorator:
        """Return a user-defined TRACE route decorator under `/api`."""

        return super().trace(user_api_path(path), **kwargs)


    def register_page_directory(self, route_prefix: str, pages_directory: Path) -> None:
        """Register XML files from a directory as SDK pages."""

        normalized_prefix = normalize_mount_path(route_prefix)
        registered_pages: list[PageDefinition] = self.state.page_registry
        stale_page_prefix = "/" if normalized_prefix == "/" else f"{normalized_prefix}/"
        stale_page_paths = {
            page.path for page in registered_pages if page.path.startswith(stale_page_prefix)
        }

        # Remove previously registered SDK page routes before replacing the page registry.
        if stale_page_paths:
            self.router.routes = [
                route for route in self.router.routes if getattr(route, "path", None) not in stale_page_paths
            ]

        registered_pages[:] = [
            page for page in registered_pages if page.path not in stale_page_paths
        ]

        # Discover XML page files in deterministic order.
        for page_file in sorted(pages_directory.rglob("*.xml")):
            relative_path = page_file.relative_to(pages_directory).as_posix()
            route_path = f"{normalized_prefix}/{relative_path}"
            LonglinkXml(page_file).validate()
            page_content = page_file.read_text(encoding="utf-8")
            page_name, page_icon = extract_longlink_metadata(page_content)

            async def page_endpoint(page_path: Path = page_file) -> str:
                """Return XML page content from disk."""

                return page_path.read_text(encoding="utf-8")

            registered_path = normalize_page_path(route_path)
            registered_pages.append(
                PageDefinition(
                    path=registered_path,
                    handler=page_endpoint,
                    route=page_file_route(relative_path),
                    tab=page_file_tab(relative_path),
                    name=page_name,
                    icon=page_icon,
                )
            )
            super().add_api_route(
                registered_path,
                page_endpoint,
                methods=["GET"],
                response_class=XMLResponse,
                include_in_schema=False,
            )
