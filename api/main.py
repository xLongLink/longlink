import asyncio
import logging
import contextlib
from src import errors
from fastapi import FastAPI, Request, Response
from pathlib import Path
from longlink import errors as solution_errors
from src.utils import jobs
from src.routes import v1, branding
from src.kubernetes import client
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

    tasks: tuple[asyncio.Task[None], ...] = ()

    try:
        # Start database work independently so static routes remain available during database outages.
        tasks = (
            asyncio.create_task(jobs.run_administrator_reconciler()),
            asyncio.create_task(jobs.run_operation_scheduler()),
        )

        yield
    finally:
        try:
            # Always stop background consumers before releasing their shared transports and database pool.
            for task in tasks:
                task.cancel()

            # Join every worker before propagating failure so another worker's cleanup can still finish.
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for result in results:
                if isinstance(result, BaseException) and not isinstance(result, asyncio.CancelledError):
                    raise result
        finally:
            try:
                # Kubernetes requests and port forwards have finished before their shared transport closes.
                await client.dispose_clients()
            finally:
                # A transport cleanup failure must not prevent database pool disposal.
                await dispose_engine()


app = FastAPI(
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    title="LongLink Platform API",
    version="1.0.0",
)


AUTHENTICATION_COOKIES = frozenset(
    {
        AUTH_COOKIE,
        OAUTH_STATE_COOKIE,
        PASSWORD_RESET_COOKIE,
        REGISTRATION_COOKIE,
    }
)
UNSAFE_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})


@app.middleware("http")
async def prevent_cross_origin_authenticated_writes(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    """Reject unsafe requests that use browser-only authentication cookies from untrusted origins."""

    # Cookie-authenticated browser writes must originate from a trusted frontend origin.
    if (
        request.method in UNSAFE_METHODS
        and AUTHENTICATION_COOKIES.intersection(request.cookies)
        and request.headers.get("origin") != env.PUBLIC_URL
    ):
        return JSONResponse(status_code=403, content={"detail": "Origin required"})

    return await call_next(request)


# Apply the same public contract to domain, HTTP, validation, and unexpected failures.
app.exception_handler(errors.ServiceError)(errors.service_error_response)
solution_errors.install_error_handlers(app)


@app.middleware("http")
async def prevent_authenticated_response_caching(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    """Prevent browser and intermediary caching of authenticated API responses."""

    response = await call_next(request)

    # Authentication dependencies set this only after validating the browser credential.
    if getattr(request.state, "authenticated", False):
        response.headers.setdefault("Cache-Control", "no-store")

    return response


app.add_middleware(FrontendMiddleware)


@app.middleware("http")
async def redirect_public_hostname(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
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
app.include_router(branding.router)
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

    app.frontend("/", directory=static_dir)
