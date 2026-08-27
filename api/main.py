import asyncio
import contextlib
from fastapi import FastAPI, Request
from pathlib import Path
from src.utils import jobs
from src.errors import ServiceError
from src.routes import v1, branding
from collections.abc import Callable, Awaitable, AsyncGenerator
from src.environments import env
from fastapi.responses import FileResponse, JSONResponse
from longlink.middleware import FrontendMiddleware
from starlette.responses import Response
from src.database.session import session_scope
from src.database.services import users as user_service
from fastapi.middleware.cors import CORSMiddleware


@contextlib.asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """Run this API replica's registered Operation scheduler."""

    # Reconcile the configured Platform administrator before serving authenticated traffic.
    async with session_scope() as session:
        await user_service.ensure_administrator(session)
        await session.commit()

    # Start this replica's scheduler with the explicit registered handlers.
    worker = asyncio.create_task(jobs.run_operation_scheduler())

    # Always stop the Operation scheduler when the application lifespan exits.
    try:
        yield
    finally:
        worker.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await worker


app = FastAPI(
    lifespan=lifespan,
    docs_url=None,
    redoc_url="/api/v1/redocs",
    openapi_url="/api/v1/openapi.json",
    title="LongLink Platform API",
    version="1.0.0",
)


AUTHENTICATION_COOKIES = frozenset(
    {
        "longlink_auth",
        "longlink_password_reset",
        "longlink_registration",
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
        and request.headers.get("origin") not in env.trusted_origins()
    ):
        return JSONResponse(status_code=403, content={"detail": "Origin required"})

    return await call_next(request)


@app.exception_handler(ServiceError)
async def service_error_response(_request: Request, error: ServiceError):
    """Return expected service failures as API responses."""

    return JSONResponse(status_code=error.status_code, content={"detail": str(error)})


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

# Register the versioned Platform API after constructing the application.
app.include_router(v1.router)
app.include_router(branding.router)
static_dir = Path(__file__).resolve().parent / "src" / ".static" / "web"
if static_dir.exists():
    # Serve the prerendered home document before registering the generic SPA fallback.
    @app.get("/", include_in_schema=False)
    async def frontend_root():
        """Return the prerendered LongLink home page."""

        return FileResponse(static_dir / "__root.html")

    app.frontend("/", directory=static_dir)

# Local development entrypoint. Production imports the app with Uvicorn, so this block is not executed.
if __name__ == "__main__":
    import uvicorn

    if env.DEVELOPMENT:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["http://localhost:5173"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    uvicorn.run(app, host="127.0.0.1", port=8000)
