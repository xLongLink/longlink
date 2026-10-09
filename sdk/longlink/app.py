import httpx2
import logging
from typing import Any
from fastapi import FastAPI, APIRouter
from fastmcp import FastMCP
from pathlib import Path
from contextlib import asynccontextmanager
from dataclasses import dataclass
from fsspec.spec import AbstractFileSystem
from longlink.views import ViewDefinition, view_stem_route
from collections.abc import Mapping, Callable, Awaitable, AsyncIterator
from fastapi.routing import APIRoute
from longlink.errors import install_error_handlers
from longlink.logger import ApiAccessFilter
from longlink.routes import router
from longlink.context import install_context_middleware
from fastapi.responses import Response, RedirectResponse
from starlette.routing import Match, BaseRoute
from longlink.constants import ROOT
from longlink.middleware import FrontendMiddleware
from fastapi.openapi.utils import get_openapi
from longlink.storage.base import create_fs
from longlink.database.base import LOCAL_USER_ID, Database
from longlink.utils.settings import Envs
from fastmcp.utilities.openapi import HTTPRoute
from fastmcp.server.dependencies import get_http_headers
from fastmcp.server.providers.openapi import MCPType


@dataclass(slots=True)
class RuntimeState:
    """Hold mutable SDK state for one FastAPI application."""

    storage: AbstractFileSystem
    database: Database


def _view_handler(content: bytes) -> Callable[[], Awaitable[Response]]:
    """Capture JSX source without exposing it as a request parameter."""

    # Bind each document in its own closure before FastAPI inspects the endpoint signature.
    async def view() -> Response:
        """Return JSX source captured during application startup without executing it."""

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

        # Solutions provide .jsx files in the generated source layout.
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
        runtime_router = router(view_definitions)
        self.include_router(runtime_router)
        runtime_operation_ids = {route.unique_id for route in runtime_router.routes if isinstance(route, APIRoute)}

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

        # Credentials come from the current MCP request, never tool arguments or a previous caller.
        async def forward_credentials(request: httpx2.Request) -> None:
            """Forward only request-owned credentials into the Solution's identity boundary."""

            headers = get_http_headers(include={"authorization", "cookie"})
            for name in ("authorization", "cookie", "x-longlink-identity"):
                request.headers.pop(name, None)
                if name in headers:
                    request.headers[name] = headers[name]

        def map_route(route: HTTPRoute, mcp_type: MCPType) -> MCPType:
            """Exclude SDK operations from MCP discovery and execution."""

            # Filter by operation identity without hiding Solution methods sharing an SDK path.
            return MCPType.EXCLUDE if route.operation_id in runtime_operation_ids else mcp_type

        # Preserve SDK startup and shutdown while giving MCP its own managed lifespan.
        runtime_lifespan = self.router.lifespan_context

        @asynccontextmanager
        async def lifespan(app: FastAPI) -> AsyncIterator[Mapping[str, Any]]:
            """Build the completed Solution catalog and close MCP sessions before runtime services."""

            async with runtime_lifespan(app) as state:
                # Use a fresh schema, including routes registered after an earlier OpenAPI request.
                schema = get_openapi(
                    title=self.title,
                    version=self.version,
                    openapi_version=self.openapi_version,
                    description=self.description,
                    routes=self.routes,
                )
                transport = httpx2.ASGITransport(app=self, raise_app_exceptions=False)
                client = httpx2.AsyncClient(
                    transport=transport,
                    base_url="http://solution",
                    timeout=10.0,
                    event_hooks={"request": [forward_credentials]},
                )
                async with client:
                    mcp = FastMCP.from_openapi(
                        openapi_spec=schema,
                        client=client,
                        name=self.title,
                        route_map_fn=map_route,
                    )

                    # Place MCP ahead of all frontend routes and own its public lifespan context.
                    mcp_app = mcp.http_app(path="/mcp", json_response=True)
                    self.router.routes[0:0] = mcp_app.routes
                    try:
                        async with mcp_app.lifespan(mcp_app):
                            yield state or {}
                    finally:
                        # Remove only these routes so later lifespans cannot reuse a closed transport.
                        for route in mcp_app.routes:
                            self.router.routes.remove(route)

        self.router.lifespan_context = lifespan

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
        for definition in self._views:
            view_path = f"/{definition.path}"
            scope = {"type": "http", "method": "GET", "path": view_path}
            if any(route.matches(scope)[0] is Match.FULL for route in routes):
                raise ValueError(f"View endpoint '{view_path}' overlaps a Solution route")

    @staticmethod
    def _discover_views(views_directory: Path) -> list[tuple[ViewDefinition, bytes]]:
        """Discover and validate all Views before registering any route."""

        registered_route_keys: set[str] = set()
        discovered_views: list[tuple[ViewDefinition, bytes]] = []

        # Discover JSX source in deterministic order without compiling JavaScript in Python.
        for view_file in sorted(views_directory.rglob("*.jsx")):
            path_without_suffix = view_file.relative_to(views_directory).as_posix().removesuffix(".jsx")

            view_path = f"views/{path_without_suffix}"
            # Read source without parsing or executing JavaScript.
            content = view_file.read_text(encoding="utf-8")
            encoded_content = content.encode("utf-8")
            if not content.strip() or len(encoded_content) > 1_000_000:
                raise ValueError(f"View source must contain between 1 and 1000000 bytes: {view_file}")

            view_route = view_stem_route(path_without_suffix)
            relative_route = view_route.removeprefix("/")
            route_key = "/".join(":" if segment.startswith(":") else segment.lower() for segment in relative_route.split("/"))

            # View endpoints and browser routes must remain unique across all directories.
            if route_key in registered_route_keys:
                raise ValueError(f"Browser route '{view_route}' is already registered")

            discovered_views.append(
                (
                    ViewDefinition(
                        path=view_path,
                        route=view_route,
                    ),
                    encoded_content,
                )
            )
            registered_route_keys.add(route_key)

        return discovered_views
