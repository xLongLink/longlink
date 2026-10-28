import asyncio
import logging
import contextlib
from fastapi import FastAPI, Request, Response
from pathlib import Path
from src.mcp import MCPMiddleware
from longlink import errors as solution_errors
from pydantic import TypeAdapter
from src.utils import jobs
from src.logger import logger as logger
from src.routes import v1, mcp
from src.kubernetes import client
from src.operations import invoices
from collections.abc import Callable, Awaitable, AsyncGenerator
from longlink.logger import ApiAccessFilter
from src.environments import env
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from src.utils.cookies import AUTH_COOKIE, OAUTH_STATE_COOKIE, REGISTRATION_COOKIE, PASSWORD_RESET_COOKIE
from longlink.middleware import FrontendMiddleware
from src.database.session import dispose_engine

# Keep successful Kubernetes probes out of the Platform API access log.
logging.getLogger("uvicorn.access").addFilter(ApiAccessFilter())


@contextlib.asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """Run this API replica's background jobs."""

    # Dispose shared resources in reverse registration order, even when cleanup fails.
    async with contextlib.AsyncExitStack() as stack:
        stack.push_async_callback(dispose_engine)
        stack.push_async_callback(client.dispose_clients)
        tasks: tuple[asyncio.Task[None], ...] = ()

        try:

            # Start database work independently so static routes remain available during database outages.
            tasks = (
                asyncio.create_task(jobs.run_administrator_reconciler()),
                asyncio.create_task(jobs.run_operation_scheduler()),
                asyncio.create_task(invoices.run()),
            )

            yield
        finally:

            # Always stop background consumers before releasing their shared transports and database pool.
            for task in tasks:
                task.cancel()

            # Join every worker before propagating failure so another worker's cleanup can still finish.
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for result in results:

                # Worker cancellation is expected; other cleanup failures must propagate.
                if isinstance(result, BaseException) and not isinstance(result, asyncio.CancelledError):
                    raise result


app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None, title="LongLink Platform API", version="1.0.0")


AUTHENTICATION_COOKIES = frozenset({AUTH_COOKIE, OAUTH_STATE_COOKIE, PASSWORD_RESET_COOKIE, REGISTRATION_COOKIE})
UNSAFE_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})


# Apply the same public contract to HTTP, validation, and unexpected failures.
solution_errors.install_error_handlers(app)


@app.middleware("http")
async def apply_response_policies(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
    """Enforce browser write origins and protect authenticated or missing-page responses."""

    # Cookie-authenticated browser writes must originate from a trusted frontend origin.
    if (
        request.method in UNSAFE_METHODS
        and AUTHENTICATION_COOKIES.intersection(request.cookies)
        and request.headers.get("origin") != env.PUBLIC_URL
    ):
        return JSONResponse(status_code=403, content={"detail": "Origin required"})

    # Apply response policies only after admitting the request and completing downstream handling.
    response = await call_next(request)

    # Authentication dependencies set this only after validating the browser credential.
    if getattr(request.state, "user", None) is not None:
        response.headers.setdefault("Cache-Control", "no-store")

    # Publish crawler instructions before JavaScript runs on missing frontend pages.
    if response.status_code == 404 and response.headers.get("content-type", "").startswith("text/html"):
        response.headers["X-Robots-Tag"] = "noindex"

    return response


app.add_middleware(FrontendMiddleware)
app.add_middleware(MCPMiddleware)


@app.middleware("http")
async def redirect_public_hostname(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
    """Redirect the production apex hostname without affecting other installations."""

    # Normalize the public hostname before frontend routing or authentication runs.
    if request.url.hostname == "longlink.dev":
        raw_path = request.scope.get("raw_path")
        path = raw_path.decode("latin-1") if raw_path is not None else request.url.path
        url = request.url.replace(scheme="https", netloc="www.longlink.dev", path=path)
        return RedirectResponse(str(url), status_code=308)

    return await call_next(request)


# Register the versioned Platform API after constructing the application.
app.include_router(v1.router)
app.include_router(mcp.router)
static_dir = Path(__file__).resolve().parent / "src" / ".static" / "web"
if static_dir.exists():

    # Serve the prerendered home document before registering the generic SPA fallback.
    @app.api_route("/", methods=["GET", "HEAD"], include_in_schema=False)
    def frontend_root():
        """Return the prerendered LongLink home page."""

        return FileResponse(static_dir / "__root.html")

    @app.api_route("/index.html", methods=["GET", "HEAD"], include_in_schema=False)
    def redirect_frontend_index(request: Request) -> RedirectResponse:
        """Redirect the generic frontend fallback document to the prerendered home page."""

        query = f"?{request.url.query}" if request.url.query else ""
        return RedirectResponse(f"/{query}", status_code=308)

    # Only declared application routes may use the generic SPA document.
    spa_paths_adapter = TypeAdapter(list[str])
    spa_paths = spa_paths_adapter.validate_json((static_dir / "spa.json").read_bytes())

    def frontend_spa() -> FileResponse:
        """Return the client-rendered application for a known route."""

        return FileResponse(static_dir / "index.html")

    for spa_path in spa_paths:
        app.add_api_route(spa_path, frontend_spa, methods=["GET", "HEAD"], include_in_schema=False)
        app.add_api_route(f"{spa_path}/", frontend_spa, methods=["GET", "HEAD"], include_in_schema=False)

    # Serve the dedicated error URL with the same status as unknown frontend paths.
    @app.api_route("/404.html", methods=["GET", "HEAD"], include_in_schema=False)
    @app.api_route("/404", methods=["GET", "HEAD"], include_in_schema=False)
    @app.api_route("/404/", methods=["GET", "HEAD"], include_in_schema=False)
    def frontend_not_found() -> FileResponse:
        """Return the prerendered missing-page document without indexing it."""

        return FileResponse(static_dir / "404.html", status_code=404)

    app.frontend("/", directory=static_dir, fallback="404.html")
