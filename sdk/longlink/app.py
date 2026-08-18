import logging
from typing import Literal
from fastapi import FastAPI
from pathlib import Path
from functools import partial
from dataclasses import dataclass
from fsspec.spec import AbstractFileSystem
from longlink.pages import PageDefinition, page_file_route
from longlink.logger import ApiAccessFilter
from longlink.routes import root, router
from longlink.context import install_context_middleware
from fastapi.responses import Response
from starlette.routing import Match
from longlink.constants import ROOT
from longlink.utils.xml import Element
from longlink.middleware import install_frontend_middleware
from longlink.storage.base import create_fs
from longlink.utils.settings import Envs


def render_page(content: str) -> Response:
    """Return one static XML page."""

    return Response(content, media_type="application/xml")


@dataclass(slots=True)
class RuntimeState:
    """Hold mutable SDK state for one FastAPI application."""

    pages: list[PageDefinition]
    storage: AbstractFileSystem


class LongLink:
    """Install LongLink runtime services into one Application-owned FastAPI app."""

    def __init__(self, app: FastAPI, env: Literal["development", "testing", "production"] | None = None) -> None:
        """Install runtime services, routes, and the frontend fallback into an Application app."""

        # Preserve Application routes so page collisions are rejected during discovery.
        self.application_routes = list(app.router.routes)
        self.app = app

        # Resolve the runtime environment and initialize mutable page state.
        environment = Envs().ENV if env is None else Envs(ENV=env).ENV
        app.state.longlink = RuntimeState(pages=[], storage=create_fs())

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
        app.include_router(router)

        # Bind Platform request identity across downstream request handling.
        install_context_middleware(app)

        # Applications provide XML pages in the generated source layout.
        pages_directory = Path.cwd() / "src" / "pages"
        if not pages_directory.is_dir():
            raise ValueError(f"Application source directory is required: {pages_directory}")
        self._register_page_directory(pages_directory)

        # Start applications on their first static page instead of an unselected shell.
        root.install_redirect(app)

        # Serve the embedded frontend last so Application routes retain precedence.
        if (ROOT / ".static" / "web").exists():
            app.frontend("/", directory=ROOT / ".static" / "web")

    def _register_page_directory(self, pages_directory: Path) -> None:
        """Register XML files from a directory as SDK pages."""

        # Validate the complete catalog before registering its routes and metadata.
        discovered_pages = self._discover_pages(pages_directory)
        page_routes = [
            self.app.router.route_class(
                definition.path,
                partial(render_page, content),
                methods=["GET"],
                include_in_schema=False,
            )
            for definition, content in discovered_pages
        ]

        # Pages are registered once before the frontend mount is installed.
        self.app.router.routes.extend(page_routes)
        self.app.state.longlink.pages.extend(definition for definition, _ in discovered_pages)

    def _discover_pages(self, pages_directory: Path) -> list[tuple[PageDefinition, str]]:
        """Discover and validate all XML pages before registering any route."""

        registered_route_keys: set[str] = set()
        discovered_pages: list[tuple[PageDefinition, str]] = []

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
            page_name = (page_root.get("name") or "").strip() or None
            page_icon = (page_root.get("icon") or "").strip() or None

            page_route = page_file_route(relative_path)
            route_key = "/".join(":" if segment.startswith(":") else segment for segment in page_route.split("/"))
            tab = page_route.split("/:", 1)[0] or page_route.removeprefix(":") or "index"

            # Page endpoints and browser routes must remain unique across all directories.
            if route_key in registered_route_keys:
                raise ValueError(f"Browser route '{page_route}' is already registered")

            # Application routes take precedence, so ambiguous page endpoints are rejected.
            for application_route in self.application_routes:
                match, _ = application_route.matches({"type": "http", "method": "GET", "path": registered_path})
                if match is Match.FULL:
                    raise ValueError(f"Page endpoint '{registered_path}' overlaps an Application route")

            discovered_pages.append(
                (
                    PageDefinition(
                        path=registered_path,
                        route=page_route,
                        tab=tab,
                        name=page_name,
                        icon=page_icon,
                    ),
                    page.content,
                )
            )
            registered_route_keys.add(route_key)

        return discovered_pages
