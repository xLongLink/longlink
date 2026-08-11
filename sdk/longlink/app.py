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
from starlette.routing import Match
from longlink.constants import ROOT
from longlink.utils.xml import Element
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


class LongLink:
    """Install LongLink runtime services into one Application-owned FastAPI app."""

    def __init__(self, app: FastAPI, env: Environment | None = None) -> None:
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

        # Applications always provide translations and pages in the generated source layout.
        source_directory = Path.cwd() / "src"
        translations_directory = source_directory / "i18n"
        pages_directory = source_directory / "pages"
        missing_directories = [directory for directory in (translations_directory, pages_directory) if not directory.is_dir()]
        if missing_directories:
            raise ValueError(f"Application source directories are required: {', '.join(str(directory) for directory in missing_directories)}")
        app.mount("/i18n", StaticFiles(directory=translations_directory), name="translations")
        self._register_page_directory(pages_directory)

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

    def _register_page_directory(self, pages_directory: Path) -> None:
        """Register XML files from a directory as SDK pages."""

        # Validate the complete catalog before registering its routes and metadata.
        discovered_pages = self._discover_pages(pages_directory)
        page_routes = [
            self.app.router.route_class(
                page.definition.path,
                partial(lambda content: Response(content, media_type="application/xml"), page.content),
                methods=["GET"],
                include_in_schema=False,
            )
            for page in discovered_pages
        ]

        # Pages are registered once before the frontend mount is installed.
        self.app.router.routes.extend(page_routes)
        self.app.state.page_registry.extend(page.definition for page in discovered_pages)

    def _discover_pages(self, pages_directory: Path) -> list[DiscoveredPage]:
        """Discover and validate all XML pages before registering any route."""

        registered_paths: set[str] = set()
        registered_route_keys: set[str] = set()
        discovered_pages: list[DiscoveredPage] = []

        # Discover XML page files in deterministic order.
        for page_file in sorted(pages_directory.rglob("*.xml")):
            relative_path = page_file.relative_to(pages_directory).as_posix()
            path_without_suffix = relative_path.removesuffix(".xml")

            # FastAPI parameter syntax is reserved for application routes, not page file names.
            if not path_without_suffix or any("{" in segment or "}" in segment for segment in path_without_suffix.split("/")):
                raise ValueError("Page endpoint paths cannot contain empty names or FastAPI parameters")

            registered_path = f"/pages/{path_without_suffix}"

            # Validate XML pages and extract optional display metadata.
            page = Element(page_file)
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
