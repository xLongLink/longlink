import re
import httpx2
import logging
from typing import Any, Self
from fastapi import FastAPI, APIRouter
from fastmcp import FastMCP
from pathlib import Path
from longlink import views
from pydantic import FilePath, BaseModel
from contextlib import asynccontextmanager
from dataclasses import dataclass
from fsspec.spec import AbstractFileSystem
from collections.abc import Mapping, Callable, Awaitable, AsyncGenerator
from fastapi.routing import APIRoute
from longlink.errors import install_error_handlers
from longlink.logger import ApiAccessFilter
from longlink.routes import router
from fastapi.responses import Response, RedirectResponse
from starlette.routing import Match
from longlink.constants import ROOT
from longlink.middleware import FrontendMiddleware
from fastapi.openapi.utils import get_openapi
from longlink.storage.base import create_fs
from longlink.database.base import LOCAL_USER_ID, Database
from longlink.utils.settings import Envs
from fastmcp.utilities.openapi import HTTPRoute
from fastmcp.server.dependencies import get_http_headers
from longlink.middleware.identity import IdentityMiddleware
from fastmcp.server.providers.openapi import MCPType


class FrontendAssets(BaseModel):
    """Validate the required frontend files packaged with this SDK."""

    # Required frontend assets.
    index: FilePath
    script: FilePath
    styles: FilePath
    manifest: FilePath


@dataclass(slots=True)
class RuntimeState:
    """Hold mutable SDK state for one FastAPI application."""

    storage: AbstractFileSystem
    database: Database

    @classmethod
    def from_settings(cls, settings: Envs) -> Self:
        """Construct the services owned by one application runtime."""

        # Preserve eager storage creation and lazy database initialization.
        storage = create_fs(settings)
        database = Database(settings)
        return cls(storage=storage, database=database)


def _view_handler(content: bytes) -> Callable[[], Awaitable[Response]]:
    """Capture JSX source without exposing it as a request parameter."""

    # Bind each document in its own closure before FastAPI inspects the endpoint signature.
    async def view() -> Response:
        """Return JSX source captured during application startup without executing it."""

        return Response(content, media_type="text/plain")

    return view


def _is_automatic_tab(view: views.ViewDefinition) -> bool:
    """Identify non-root, top-level static Views for automatic navigation."""

    return view.route != "/" and "/" not in view.route[1:] and ":" not in view.route


class LongLink(FastAPI):
    """LongLink runtime application with Platform services installed."""

    def __init__(self) -> None:
        """Install runtime services, routes, and the frontend fallback."""

        super().__init__()

        # Validate the Platform-provided runtime environment before loading Solution files.
        settings = Envs()

        # Require the frontend and component runtime packaged with this SDK before loading Solution files.
        frontend_directory = ROOT / ".static" / "web"
        frontend_assets = FrontendAssets(
            index=frontend_directory / "index.html",
            script=frontend_directory / "views" / "runtime.js",
            styles=frontend_directory / "views" / "runtime.css",
            manifest=frontend_directory / "views" / "runtime.json",
        )

        # Validate the manifest's content version separately from file existence.
        view_runtime = views.ViewRuntime.model_validate_json(frontend_assets.manifest.read_bytes())

        # Solutions provide .jsx files in the generated source layout.
        views_directory = Path.cwd() / "src" / "views"
        if not views_directory.is_dir():
            raise ValueError(f"Solution source directory is required: {views_directory}")

        # Validate the complete catalog before installing runtime services.
        discovered_views = views.discover(views_directory)
        view_definitions = [definition for definition, _ in discovered_views]

        # Declare the pinned runtime once for the complete Solution catalog.
        view_manifest = views.ViewManifest(views=view_definitions, runtime=view_runtime)

        # Initialize Solution storage and database connections.
        runtime = RuntimeState.from_settings(settings)

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
        runtime_router = router(view_manifest)
        self.include_router(runtime_router)
        runtime_operation_ids = {route.unique_id for route in runtime_router.routes if isinstance(route, APIRoute)}

        # Only production requests with a valid Platform identity may reach Solution routes.
        self.add_middleware(
            IdentityMiddleware,
            identity_secret=settings.IDENTITY_SECRET,
            require_identity=settings.ENV == "production",
            local_user_id=LOCAL_USER_ID if settings.ENV != "production" else None,
        )

        self.state.longlink = runtime

        # Views are registered once before the frontend mount is installed.
        for definition, content in discovered_views:
            self.add_api_route(f"/{definition.path}", _view_handler(content), methods=["GET"], include_in_schema=False)

        # Reserve the root redirect only when automatic navigation has a target.
        if any(_is_automatic_tab(definition) for definition in view_definitions):
            self.add_api_route("/", self._redirect_root, methods=["GET"], include_in_schema=False)

        # Share the manifest catalog after registering Views so they cannot collide with themselves.
        self._view_manifest = view_manifest

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
        async def lifespan(app: FastAPI) -> AsyncGenerator[Mapping[str, Any]]:
            """Build the completed Solution catalog and close MCP sessions before runtime services."""

            async with runtime_lifespan(app) as state:
                try:

                    # Use a fresh schema, including routes registered after an earlier OpenAPI request.
                    schema = get_openapi(
                        title=self.title,
                        version=self.version,
                        openapi_version=self.openapi_version,
                        description=self.description,
                        routes=self.routes,
                    )

                    # Keep MCP calls inside this application with request-scoped credentials.
                    transport = httpx2.ASGITransport(app=self, raise_app_exceptions=False)
                    client = httpx2.AsyncClient(
                        transport=transport, base_url="http://solution", timeout=10.0, event_hooks={"request": [forward_credentials]}
                    )
                    async with client:
                        mcp = FastMCP.from_openapi(openapi_spec=schema, client=client, name=self.title, route_map_fn=map_route)

                        # Place MCP ahead of all frontend routes and own its public lifespan context.
                        mcp_app = mcp.http_app(path="/mcp", json_response=True)
                        self.router.routes[0:0] = mcp_app.routes
                        try:

                            # Enter the public MCP lifespan before accepting Solution traffic.
                            async with mcp_app.lifespan(mcp_app):
                                yield state or {}
                        finally:

                            # Remove only these routes so later lifespans cannot reuse a closed transport.
                            for route in mcp_app.routes:
                                self.router.routes.remove(route)
                finally:

                    # Close the active services after MCP, including when initialization fails.
                    await self.state.longlink.database.dispose()

        self.router.lifespan_context = lifespan

        # Serve the embedded frontend as low-priority routes so Solution routes take precedence.
        self.frontend("/", directory=frontend_assets.index.parent)

    def include_view(self, path: str, *, label: str | None = None, icon: str | None = None) -> None:
        """Include a discovered JSX View as a tab, in registration order, with an optional label and Lucide icon name."""

        # Accept only canonical JSX paths relative to the Solution's Views directory.
        if not isinstance(path, str) or not path.endswith(".jsx"):
            raise ValueError("View path must be a relative .jsx file name")

        definition = next((view for view in self._view_manifest.views if f"{view.path.removeprefix('views/')}.jsx" == path), None)
        if definition is None:
            raise ValueError(f"Unknown View: {path}")

        # Navigation targets must resolve without route parameters or a root redirect loop.
        if definition.route == "/" or ":" in definition.route:
            raise ValueError("Tabs must target a non-root static View")

        if label is not None and (not isinstance(label, str) or not label.strip()):
            raise ValueError("Tab label must contain non-whitespace text")

        if icon is not None and (not isinstance(icon, str) or re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", icon) is None):
            raise ValueError("Tab icon must be a Lucide kebab-case name")

        # Validate before switching from automatic tabs to explicit navigation.
        tabs = self._view_manifest.tabs
        if tabs is not None and any(tab.route == definition.route for tab in tabs):
            raise ValueError(f"View is already included: {path}")

        if tabs is None:
            tabs = []
            self._view_manifest.tabs = tabs

        tab = views.ViewTab(route=definition.route, label=label.strip() if label is not None else None, icon=icon)
        tabs.append(tab)

        # Explicit nested tabs need a redirect even when there were no automatic root tabs.
        if len(tabs) == 1 and not any(_is_automatic_tab(view) for view in self._view_manifest.views):
            self.add_api_route("/", self._redirect_root, methods=["GET"], include_in_schema=False)

    async def _redirect_root(self) -> RedirectResponse:
        """Resolve the first tab after Solution navigation registration is complete."""

        # A root redirect is registered only when automatic or explicit tabs exist.
        tabs = self._view_manifest.tabs
        if tabs is not None:
            return RedirectResponse(tabs[0].route)

        first_route = next(view.route for view in self._view_manifest.views if _is_automatic_tab(view))
        return RedirectResponse(first_route)

    # FastAPI accepts framework-defined router options with heterogeneous values.
    def include_router(self, router: APIRouter, **kwargs: Any) -> None:
        """Include Solution routes after validating them against View endpoints."""

        # Snapshot routes so a colliding include leaves no partial registration.
        added = len(self.router.routes)
        super().include_router(router, **kwargs)

        # Validate only after framework registration succeeds.
        self._validate_added_routes(added)

    # FastAPI accepts framework-defined route arguments with heterogeneous values.
    def add_api_route(self, *args: Any, **kwargs: Any) -> None:
        """Register a Solution route after validating it against View endpoints."""

        # Snapshot routes so a colliding registration leaves no partial registration.
        added = len(self.router.routes)
        super().add_api_route(*args, **kwargs)

        # Validate only after framework registration succeeds.
        self._validate_added_routes(added)

    def _validate_added_routes(self, added: int) -> None:
        """Roll back appended routes when View overlap validation fails."""

        # Internal routes are installed before publishing the manifest for collision checks.
        manifest = getattr(self, "_view_manifest", None)
        if manifest is None:
            return

        # Remove the complete registration without handling framework errors.
        try:

            # Solution routes added after startup respect the same View endpoint contract.
            routes = self.router.routes[added:]
            for definition in manifest.views:
                view_path = f"/{definition.path}"
                scope = {"type": "http", "method": "GET", "path": view_path}

                # Reject full route matches before they shadow a registered View.
                if any(route.matches(scope)[0] is Match.FULL for route in routes):
                    raise ValueError(f"View endpoint '{view_path}' overlaps a Solution route")
        except ValueError:
            del self.router.routes[added:]
            raise
