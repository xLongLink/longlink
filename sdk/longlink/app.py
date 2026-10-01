import logging
from typing import Any
from fastapi import FastAPI, APIRouter
from pathlib import Path
from dataclasses import dataclass
from fsspec.spec import AbstractFileSystem
from longlink.views import ViewDefinition, view_stem_route
from collections.abc import Callable
from longlink.errors import install_error_handlers
from longlink.logger import ApiAccessFilter
from longlink.routes import router
from longlink.context import install_context_middleware
from fastapi.responses import Response, RedirectResponse
from starlette.routing import Match, BaseRoute
from longlink.constants import ROOT
from longlink.middleware import FrontendMiddleware
from longlink.utils.view import validate_view
from longlink.storage.base import create_fs
from longlink.database.base import LOCAL_USER_ID, Database
from longlink.utils.settings import Envs


@dataclass(slots=True)
class RuntimeState:
    """Hold mutable SDK state for one FastAPI application."""

    storage: AbstractFileSystem
    database: Database


def _view_handler(content: str) -> Callable[[], Response]:
    """Capture static View markup without exposing it as a request parameter."""

    # Bind each document in its own closure before FastAPI inspects the endpoint signature.
    def view() -> Response:
        """Return the validated View captured during application startup."""

        return Response(content, media_type="text/plain")

    return view


class LongLink(FastAPI):
    """LongLink runtime application with Platform services installed."""

    def __init__(self) -> None:
        """Install runtime services, routes, and the frontend fallback."""

        super().__init__()
        self._views: list[ViewDefinition] = []

        # Validate the Platform-provided runtime environment before loading Solution files.
        settings = Envs()

        # Require the frontend entry point supplied by the packaged SDK.
        frontend_index = ROOT / ".static" / "web" / "index.html"
        if not frontend_index.is_file():
            raise RuntimeError(f"LongLink embedded frontend is required: {frontend_index}")

        # Solutions provide .view files in the generated source layout.
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

        # Only production requests with a valid Platform identity may reach Solution routes.
        install_context_middleware(
            self,
            settings.IDENTITY_SECRET,
            require_identity=settings.ENV == "production",
            local_user_id=LOCAL_USER_ID if settings.ENV != "production" else None,
        )

        self.state.longlink = RuntimeState(storage=storage, database=database)

        async def close_database() -> None:
            """Dispose the active database when the application shuts down."""

            await self.state.longlink.database.dispose()

        self.router.add_event_handler("shutdown", close_database)

        # Views are registered once before the frontend mount is installed.
        for definition, content in discovered_views:
            self.add_api_route(
                f"/{definition.path}",
                _view_handler(content),
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

        # Share the manifest catalog after registering Views so they cannot collide with themselves.
        self._views = view_definitions

        # Serve the embedded frontend as low-priority routes so Solution routes take precedence.
        self.frontend("/", directory=frontend_index.parent)

    def use_testing_environment(self) -> None:
        """Replace this application's services with isolated testing services."""

        # Select testing services for this app without changing process environment variables.
        settings = Envs(ENV="testing", STORAGE_BUCKET=None, STORAGE_PREFIX=None)
        storage = create_fs(settings)
        database = Database(settings)
        self.state.longlink = RuntimeState(storage=storage, database=database)

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
        for definition in self._views:
            view_path = f"/{definition.path}"
            scope = {"type": "http", "method": "GET", "path": view_path}
            if any(route.matches(scope)[0] is Match.FULL for route in routes):
                raise ValueError(f"View endpoint '{view_path}' overlaps a Solution route")

    @staticmethod
    def _discover_views(views_directory: Path) -> list[tuple[ViewDefinition, str]]:
        """Discover and validate all Views before registering any route."""

        registered_route_keys: set[str] = set()
        discovered_views: list[tuple[ViewDefinition, str]] = []

        # Discover .view files in deterministic order.
        for view_file in sorted(views_directory.rglob("*.view")):
            path_without_suffix = view_file.relative_to(views_directory).as_posix().removesuffix(".view")

            view_path = f"views/{path_without_suffix}"
            # Validate component markup and extract optional display metadata.
            content = view_file.read_text(encoding="utf-8")
            view_root = validate_view(content)
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
