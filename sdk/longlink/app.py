import logging
from fastapi import FastAPI
from pathlib import Path
from functools import partial
from dataclasses import dataclass
from fsspec.spec import AbstractFileSystem
from longlink.pages import PageDefinition, page_stem_route
from longlink.logger import ApiAccessFilter
from longlink.routes import router
from longlink.context import install_context_middleware
from fastapi.responses import Response, RedirectResponse
from starlette.routing import Match, BaseRoute
from longlink.constants import ROOT
from longlink.utils.xml import validate_xml
from longlink.middleware import FrontendMiddleware
from longlink.storage.base import create_fs
from longlink.database.base import Database
from longlink.utils.settings import Envs


def render_page(content: str) -> Response:
    """Return one static XML page."""

    return Response(content, media_type="application/xml")


@dataclass(slots=True)
class RuntimeState:
    """Hold mutable SDK state for one FastAPI application."""

    pages: list[PageDefinition]
    storage: AbstractFileSystem
    database: Database


class LongLink:
    """Install LongLink runtime services into one Application-owned FastAPI app."""

    def __init__(self, app: FastAPI) -> None:
        """Install runtime services, routes, and the frontend fallback into an Application app."""

        # Preserve Application routes so page collisions are rejected during discovery.
        application_routes = list(app.router.routes)

        # Resolve the runtime environment and initialize application storage.
        settings = Envs()
        storage = create_fs(settings)
        database = Database(settings)

        # Compress the embedded frontend and apply safe browser cache policies.
        app.add_middleware(FrontendMiddleware)

        # Production containers attach API access filtering here.
        if settings.ENV == "production":
            # Built app containers run plain uvicorn, so attach the SDK access filter here.
            access_logger = logging.getLogger("uvicorn.access")

            # Avoid installing the access filter more than once.
            if not any(isinstance(item, ApiAccessFilter) for item in access_logger.filters):
                access_logger.addFilter(ApiAccessFilter())

        # Mount SDK-managed routes before user-facing assets.
        app.include_router(router)

        # Bind Platform request identity across downstream request handling.
        install_context_middleware(app, settings.IDENTITY_SECRET or "")

        # Applications provide XML pages in the generated source layout.
        pages_directory = Path.cwd() / "src" / "pages"
        if not pages_directory.is_dir():
            raise ValueError(f"Application source directory is required: {pages_directory}")

        # Validate the complete catalog before registering its routes and metadata.
        discovered_pages = self._discover_pages(pages_directory, application_routes)
        app.state.longlink = RuntimeState(pages=[definition for definition, _ in discovered_pages], storage=storage, database=database)
        app.router.on_shutdown.append(database.dispose)

        # Pages are registered once before the frontend mount is installed.
        for definition, content in discovered_pages:
            app.add_api_route(
                f"/{definition.path}",
                partial(render_page, content),
                methods=["GET"],
                include_in_schema=False,
            )

        # Make the browser root URL resolve to the first navigable application page.
        first_tab_page = next(
            (definition for definition, _ in discovered_pages if definition.route != "/" and ":" not in definition.route),
            None,
        )
        if first_tab_page:

            @app.get("/", include_in_schema=False)
            def redirect_root() -> RedirectResponse:
                """Redirect the application root to its first static tab."""

                return RedirectResponse(first_tab_page.route)

        # Serve the embedded frontend last so Application routes retain precedence.
        if (ROOT / ".static" / "web").exists():
            app.frontend("/", directory=ROOT / ".static" / "web")

    @staticmethod
    def _discover_pages(pages_directory: Path, application_routes: list[BaseRoute]) -> list[tuple[PageDefinition, str]]:
        """Discover and validate all XML pages before registering any route."""

        registered_route_keys: set[str] = set()
        discovered_pages: list[tuple[PageDefinition, str]] = []

        # Discover XML page files in deterministic order.
        for page_file in sorted(pages_directory.rglob("*.xml")):
            path_without_suffix = page_file.relative_to(pages_directory).as_posix().removesuffix(".xml")

            page_path = f"pages/{path_without_suffix}"
            registered_path = f"/{page_path}"

            # Validate XML pages and extract optional display metadata.
            content = page_file.read_text(encoding="utf-8")
            page_root = validate_xml(content)
            page_name = page_root.get("name", "").strip() or None
            page_icon = page_root.get("icon", "").strip() or None

            page_route = page_stem_route(path_without_suffix)
            relative_route = page_route.removeprefix("/")
            route_key = "/".join(":" if segment.startswith(":") else segment for segment in relative_route.split("/"))
            tab = relative_route.split("/:", 1)[0] or "index"

            # Page endpoints and browser routes must remain unique across all directories.
            if route_key in registered_route_keys:
                raise ValueError(f"Browser route '{page_route}' is already registered")

            # Application routes take precedence, so ambiguous page endpoints are rejected.
            scope = {"type": "http", "method": "GET", "path": registered_path}
            if any(application_route.matches(scope)[0] is Match.FULL for application_route in application_routes):
                raise ValueError(f"Page endpoint '{registered_path}' overlaps an Application route")

            discovered_pages.append(
                (
                    PageDefinition(
                        path=page_path,
                        route=page_route,
                        tab=tab,
                        name=page_name,
                        icon=page_icon,
                    ),
                    content,
                )
            )
            registered_route_keys.add(route_key)

        return discovered_pages
