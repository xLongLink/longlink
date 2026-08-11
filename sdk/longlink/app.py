import logging
from typing import Literal
from fastapi import FastAPI
from pathlib import Path
from functools import partial
from dataclasses import dataclass
from longlink.pages import PageDefinition, page_route_key, page_file_route, extract_longlink_metadata
from longlink.utils import Envs
from longlink.logger import ApiAccessFilter
from longlink.routes import routes
from fastapi.responses import Response, RedirectResponse
from starlette.routing import Match, BaseRoute
from longlink.constants import ROOT
from longlink.utils.xml import Longlink as LonglinkXml
from fastapi.staticfiles import StaticFiles
from longlink.middleware import install_frontend_middleware
from fastapi.middleware.cors import CORSMiddleware
from longlink.database.audit import install_audit_middleware

Environment = Literal["development", "testing", "production"]


@dataclass(slots=True)
class DiscoveredPage:
    """Describe one validated XML page ready for route registration."""

    definition: PageDefinition
    content: str


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

        # Preserve Application routes so page collisions are rejected during discovery.
        self.application_routes = list(app.router.routes)
        self.app = app

        # Resolve the runtime environment and initialize mutable page state.
        environment = Envs().ENV if env is None else Envs(ENV=env).ENV
        app.state.page_registry = []

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

        # Start applications on their first static page instead of an unselected shell.
        self.install_root_redirect()

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

        # Serve the embedded frontend last so Application routes retain precedence.
        if (ROOT / ".static" / "web").exists():
            app.frontend("/", directory=ROOT / ".static" / "web")

    def install_root_redirect(self) -> None:
        """Redirect the application root to its first static page."""

        # Dynamic pages need parameters and cannot be startup destinations.
        first_page = next((page for page in self.app.state.page_registry if page.route and ":" not in page.route), None)

        # Let the frontend render applications without a static startup page.
        if first_page is None:
            return

        @self.app.get("/", include_in_schema=False)
        def redirect_to_first_page() -> RedirectResponse:
            """Send root requests to the first registered static page."""

            return RedirectResponse(url=f"/{first_page.route}", status_code=307)

    def register_page_directory(self, route_prefix: str, pages_directory: Path) -> None:
        """Register XML files from a directory as SDK pages."""

        # Identify existing SDK pages that this directory replaces without mutating them.
        normalized_prefix = normalize_mount_path(route_prefix)
        registered_pages: list[PageDefinition] = self.app.state.page_registry
        stale_page_prefix = f"{normalized_prefix.rstrip('/')}/"
        stale_page_paths = {page.path for page in registered_pages if page.path.startswith(stale_page_prefix)}
        retained_pages = [page for page in registered_pages if page.path not in stale_page_paths]

        # Validate the complete replacement catalog before changing routes or registry state.
        discovered_pages = self.discover_pages(normalized_prefix, pages_directory, retained_pages)
        replacement_routes = [
            self.app.router.route_class(
                page.definition.path,
                partial(lambda content: Response(content, media_type="application/xml"), page.content),
                methods=["GET"],
                include_in_schema=False,
            )
            for page in discovered_pages
        ]
        stale_route_ids = {
            id(route)
            for route in self.app.router.routes
            if getattr(route, "path", None) in stale_page_paths
        }
        replacement_index = next(
            (index for index, route in enumerate(self.app.router.routes) if id(route) in stale_route_ids),
            len(self.app.router.routes),
        )

        # Replace managed routes at their prior position so they remain ahead of the frontend mount.
        next_routes: list[BaseRoute] = [route for route in self.app.router.routes if id(route) not in stale_route_ids]
        next_routes[replacement_index:replacement_index] = replacement_routes

        # Commit the complete catalog and its routes only after all construction has succeeded.
        self.app.router.routes[:] = next_routes
        registered_pages[:] = [*retained_pages, *(page.definition for page in discovered_pages)]

    def discover_pages(self, route_prefix: str, pages_directory: Path, registered_pages: list[PageDefinition]) -> list[DiscoveredPage]:
        """Discover and validate all XML pages before registering any route."""

        registered_paths = {page.path for page in registered_pages}
        registered_route_keys = {page_route_key(page.route) for page in registered_pages}
        discovered_pages: list[DiscoveredPage] = []

        # Discover XML page files in deterministic order.
        for page_file in sorted(pages_directory.rglob("*.xml")):
            relative_path = page_file.relative_to(pages_directory).as_posix()
            path_without_suffix = relative_path.removesuffix(".xml")

            # FastAPI parameter syntax is reserved for application routes, not page file names.
            if not path_without_suffix or any("{" in segment or "}" in segment for segment in path_without_suffix.split("/")):
                raise ValueError("Page endpoint paths cannot contain empty names or FastAPI parameters")

            registered_path = f"{route_prefix}/{path_without_suffix}"

            # Validate XML pages and extract optional display metadata.
            page = LonglinkXml(page_file)
            page_root = page.validate()
            page_name, page_icon = extract_longlink_metadata(page_root)

            page_route = page_file_route(relative_path)
            route_key = page_route_key(page_route)
            tab = page_route.split("/:", 1)[0] or page_route.removeprefix(":") or "index"

            # Page endpoints and browser routes must remain unique across all directories.
            if registered_path in registered_paths:
                raise ValueError(f"Page endpoint '{registered_path}' is already registered")
            if route_key in registered_route_keys:
                raise ValueError(f"Browser route '{page_route}' is already registered")

            # Application routes take precedence, so ambiguous page endpoints are rejected.
            for application_route in self.application_routes:
                match, _ = application_route.matches({"type": "http", "method": "GET", "path": registered_path})
                if match is Match.FULL:
                    raise ValueError(f"Page endpoint '{registered_path}' overlaps an Application route")

            discovered_pages.append(
                DiscoveredPage(
                    definition=PageDefinition(
                        path=registered_path,
                        route=page_route,
                        tab=tab,
                        name=page_name,
                        icon=page_icon,
                    ),
                    content=page.content,
                )
            )
            registered_paths.add(registered_path)
            registered_route_keys.add(route_key)

        return discovered_pages
