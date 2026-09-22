import logging
from typing import Any
from fastapi import FastAPI, APIRouter
from pathlib import Path
from dataclasses import dataclass
from fsspec.spec import AbstractFileSystem
from longlink.views import ViewDefinition, view_stem_route
from longlink.errors import install_error_handlers
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


@dataclass(slots=True)
class RuntimeState:
    """Hold mutable SDK state for one FastAPI application."""

    storage: AbstractFileSystem
    database: Database


class LongLink(FastAPI):
    """LongLink runtime application with Platform services installed."""

    def __init__(self) -> None:
        """Install runtime services, routes, and the frontend fallback."""

        super().__init__()
        self._view_endpoints: list[str] = []

        # Validate the Platform-provided runtime environment before loading Solution files.
        settings = Envs()

        # Require the frontend entry point supplied by the packaged SDK.
        frontend_index = ROOT / ".static" / "web" / "index.html"
        if not frontend_index.is_file():
            raise RuntimeError(f"LongLink embedded frontend is required: {frontend_index}")

        # Solutions provide XML views in the generated source layout.
        views_directory = Path.cwd() / "src" / "views"
        if not views_directory.is_dir():
            raise ValueError(f"Solution source directory is required: {views_directory}")

        # Validate the complete catalog before installing runtime services.
        discovered_views = self._discover_views(views_directory)
        view_definitions = [definition for definition, _ in discovered_views]

        # Initialize Solution storage and database connections.
        storage = create_fs(settings)
        database = Database(settings)

        # Supply safe defaults while preserving Solution-owned exception handlers.
        install_error_handlers(self)

        # Compress the embedded frontend and apply safe browser cache policies.
        self.add_middleware(FrontendMiddleware)

        # Production containers attach API access filtering here.
        if settings.ENV == "production":
            # Built Solution containers run plain uvicorn, so attach the SDK access filter here.
            access_logger = logging.getLogger("uvicorn.access")

            # Avoid installing the access filter more than once.
            if not any(isinstance(item, ApiAccessFilter) for item in access_logger.filters):
                access_logger.addFilter(ApiAccessFilter())

        # Mount SDK-managed routes before user-facing assets.
        self.include_router(router(view_definitions))

        # Bind Platform request identity across downstream request handling.
        install_context_middleware(self, settings.IDENTITY_SECRET or "")

        self.state.longlink = RuntimeState(storage=storage, database=database)
        self.router.add_event_handler("shutdown", database.dispose)

        # Views are registered once before the frontend mount is installed.
        for definition, content in discovered_views:

            def _view(content: str = content) -> Response:
                """Return one static XML view."""

                return Response(content, media_type="application/xml")

            self.add_api_route(
                f"/{definition.path}",
                _view,
                methods=["GET"],
                include_in_schema=False,
            )

        # Make the browser root URL resolve to the first navigable View.
        first_tab_view = next(
            (definition for definition in view_definitions if definition.route != "/" and ":" not in definition.route), None
        )
        if first_tab_view is not None:

            @self.get("/", include_in_schema=False)
            async def redirect_root() -> RedirectResponse:
                """Redirect the Solution root to its first static tab."""

                return RedirectResponse(first_tab_view.route)

        # Remember View endpoints so Solution routes added later can be validated against them.
        self._view_endpoints = [f"/{definition.path}" for definition in view_definitions]

        # Serve the embedded frontend as low-priority routes so Solution routes take precedence.
        self.frontend("/", directory=frontend_index.parent)

    # FastAPI accepts framework-defined router options with heterogeneous values.
    def include_router(self, router: APIRouter, **kwargs: Any) -> None:  # noqa: ANN401
        """Include Solution routes after validating them against View endpoints."""

        # Snapshot routes so a colliding include leaves no partial registration.
        added = len(self.router.routes)
        super().include_router(router, **kwargs)

        try:
            self._ensure_no_view_overlap(self.router.routes[added:])
        except ValueError:
            del self.router.routes[added:]
            raise

    # FastAPI accepts framework-defined route arguments with heterogeneous values.
    def add_api_route(self, *args: Any, **kwargs: Any) -> None:  # noqa: ANN401
        """Register a Solution route after validating it against View endpoints."""

        # Snapshot routes so a colliding registration leaves no partial registration.
        added = len(self.router.routes)
        super().add_api_route(*args, **kwargs)

        try:
            self._ensure_no_view_overlap(self.router.routes[added:])
        except ValueError:
            del self.router.routes[added:]
            raise

    def _ensure_no_view_overlap(self, routes: list[BaseRoute]) -> None:
        """Reject routes that would overlap a registered View endpoint."""

        # Solution routes added after startup respect the same View endpoint contract.
        for view_path in self._view_endpoints:
            scope = {"type": "http", "method": "GET", "path": view_path}
            if any(route.matches(scope)[0] is Match.FULL for route in routes):
                raise ValueError(f"View endpoint '{view_path}' overlaps a Solution route")

    @staticmethod
    def _discover_views(views_directory: Path) -> list[tuple[ViewDefinition, str]]:
        """Discover and validate all XML views before registering any route."""

        registered_route_keys: set[str] = set()
        discovered_views: list[tuple[ViewDefinition, str]] = []

        # Discover XML view files in deterministic order.
        for view_file in sorted(views_directory.rglob("*.xml")):
            path_without_suffix = view_file.relative_to(views_directory).as_posix().removesuffix(".xml")

            view_path = f"views/{path_without_suffix}"
            # Validate XML views and extract optional display metadata.
            content = view_file.read_text(encoding="utf-8")
            view_root = validate_xml(content)
            view_name = view_root.get("name", "").strip() or None
            view_icon = view_root.get("icon", "").strip() or None

            view_route = view_stem_route(path_without_suffix)
            relative_route = view_route.removeprefix("/")
            route_key = "/".join(":" if segment.startswith(":") else segment for segment in relative_route.split("/"))

            # View endpoints and browser routes must remain unique across all directories.
            if route_key in registered_route_keys:
                raise ValueError(f"Browser route '{view_route}' is already registered")

            discovered_views.append(
                (
                    ViewDefinition(
                        path=view_path,
                        route=view_route,
                        name=view_name,
                        icon=view_icon,
                    ),
                    content,
                )
            )
            registered_route_keys.add(route_key)

        return discovered_views
