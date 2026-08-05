import logging
from pathlib import Path
from functools import partial
from typing import Literal
from fastapi import FastAPI
from fastapi.routing import APIRoute
from longlink.pages import XMLResponse, PageDefinition, page_file_tab, page_file_route, normalize_page_path, extract_longlink_metadata
from longlink.utils import Envs
from longlink.logger import ApiAccessFilter, logger
from longlink.routes import routes
from longlink.constants import ROOT
from longlink.utils.xml import Longlink as LonglinkXml
from fastapi.staticfiles import StaticFiles
from longlink.middleware import install_frontend_middleware
from fastapi.middleware.cors import CORSMiddleware
from longlink.database.audit import install_audit_middleware
from starlette.routing import BaseRoute, Match

Environment = Literal["development", "testing", "production"]


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
    """Return the default source directory for one normalized SDK-managed route path."""

    source_directory = (Path.cwd() / "src").resolve()
    route_directory = (source_directory / route_path.strip("/")).resolve()

    # Prevent mounts from escaping the application source tree.
    if not route_directory.is_relative_to(source_directory):
        raise ValueError("Mount path must stay inside the src directory")

    return route_directory


class LongLink:
    """Install LongLink runtime services into one Application-owned FastAPI app."""

    def __init__(self, app: FastAPI, env: Environment | None = None, i18n: str | None = "/i18n", pages: str | None = "/pages") -> None:
        """Install runtime services, routes, and the frontend fallback into an Application app."""

        # Preserve Application routes so overlapping LongLink content can be reported.
        application_routes = list(app.router.routes)
        self.app = app

        # Resolve the runtime environment and initialize mutable page state.
        environment = Envs().ENV if env is None else Envs(ENV=env).ENV
        page_registry: list[PageDefinition] = []
        app.state.page_registry = page_registry

        # Compress the embedded frontend and apply safe browser cache policies.
        install_frontend_middleware(app)

        # Production containers attach API access filtering here.
        if environment == "production":
            # Built app containers run plain uvicorn, so attach the SDK access filter here.
            access_logger = logging.getLogger("uvicorn.access")

            # Avoid installing the access filter more than once.
            if not any(isinstance(item, ApiAccessFilter) for item in access_logger.filters):
                access_logger.addFilter(ApiAccessFilter())

        # Mount SDK-managed routes before user-facing assets.
        for router in routes:
            app.include_router(router)

        # Bind audit context across downstream request handling.
        install_audit_middleware(app)

        # Resolve the embedded frontend bundle used by the final fallback mount.
        frontend_directory = ROOT / ".static" / "web"

        # Optional translation mounts can be disabled.
        if i18n is not None:
            i18n_path = normalize_mount_path(i18n)

            # Resolve the Application translation directory and mount it when present.
            translations_directory = default_source_directory(i18n_path)
            if translations_directory.exists():
                app.mount(i18n_path, StaticFiles(directory=translations_directory), name="translations")

        # Optional page discovery can be disabled.
        if pages is not None:
            # Resolve the page directory and register it only when it exists.
            pages_path = normalize_mount_path(pages)
            pages_directory = default_source_directory(pages_path)
            if pages_directory.exists():
                self.register_page_directory(pages_path, pages_directory)

        # Enable CORS in development for local frontend access to API routes
        if environment == "development":
            app.add_middleware(
                CORSMiddleware,
                allow_origins=[
                    "http://localhost:3000",
                    "http://localhost:5173",
                ],
                allow_credentials=True,
                allow_methods=["*"],
                allow_headers=["*"],
            )

        # Report Application routes that take precedence over LongLink content.
        self.warn_overlapping_routes(application_routes)

        # Serve the embedded frontend last so Application routes retain precedence.
        if frontend_directory.exists():
            app.frontend("/", directory=frontend_directory)

    def warn_overlapping_routes(self, application_routes: list[BaseRoute]) -> None:
        """Warn when Application routes take precedence over LongLink runtime content."""

        # Combine LongLink's included routers with dynamically registered page routes.
        application_route_ids = {id(route) for route in application_routes}
        longlink_routes = [
            route for route in self.app.router.routes if isinstance(route, APIRoute) and id(route) not in application_route_ids
        ]
        longlink_routes.extend(route for router in routes for route in router.routes if isinstance(route, APIRoute))
        warned_routes: set[tuple[int, str]] = set()

        for application_route in application_routes:
            for longlink_route in longlink_routes:
                for method in longlink_route.methods or set():
                    scope = {"type": "http", "method": method, "path": longlink_route.path}
                    match, _ = application_route.matches(scope)
                    warning_key = (id(application_route), method)

                    # Application routes are registered first and therefore replace matching LongLink routes.
                    if match is Match.FULL and warning_key not in warned_routes:
                        logger.warning(
                            "Application route overlaps LongLink route %s %s. Add the /api prefix to avoid replacing LongLink content.",
                            method,
                            longlink_route.path,
                        )
                        warned_routes.add(warning_key)

    def register_page_directory(self, route_prefix: str, pages_directory: Path) -> None:
        """Register XML files from a directory as SDK pages."""

        # Prepare normalized route state for replacing pages under this directory.
        normalized_prefix = normalize_mount_path(route_prefix)
        registered_pages: list[PageDefinition] = self.app.state.page_registry
        stale_page_prefix = "/" if normalized_prefix == "/" else f"{normalized_prefix}/"
        stale_page_paths = {page.path for page in registered_pages if page.path.startswith(stale_page_prefix)}

        # Remove previously registered SDK page routes before replacing the page registry.
        if stale_page_paths:
            self.app.router.routes = [route for route in self.app.router.routes if getattr(route, "path", None) not in stale_page_paths]

        # Remove stale page metadata before discovering replacement files.
        registered_pages[:] = [page for page in registered_pages if page.path not in stale_page_paths]

        # Discover XML page files in deterministic order.
        for page_file in sorted(pages_directory.rglob("*.xml")):
            relative_path = page_file.relative_to(pages_directory).as_posix()
            route_path = f"{normalized_prefix}/{relative_path}"
            page = LonglinkXml(page_file)
            page_root = page.validate()
            page_name, page_icon = extract_longlink_metadata(page_root)
            page_endpoint = partial(page_file.read_text, encoding="utf-8")

            # Register page metadata and its normalized API route together.
            registered_path = normalize_page_path(route_path)
            registered_pages.append(
                PageDefinition(
                    path=registered_path,
                    route=page_file_route(relative_path),
                    tab=page_file_tab(relative_path),
                    name=page_name,
                    icon=page_icon,
                )
            )
            self.app.add_api_route(
                registered_path,
                page_endpoint,
                methods=["GET"],
                response_class=XMLResponse,
                include_in_schema=False,
            )
