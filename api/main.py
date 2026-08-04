import asyncio
import contextlib
from fastapi import FastAPI, Request
from pathlib import Path
from src.utils import jobs
from src.errors import ServiceError
from src.routes import v1, branding
from collections.abc import AsyncGenerator
from src.environments import env
from fastapi.responses import FileResponse, JSONResponse
from longlink.middleware import install_frontend_middleware
from src.database.services import users as user_service
from fastapi.middleware.cors import CORSMiddleware


@contextlib.asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """Run this API replica's registered Operation scheduler."""

    # Reconcile the configured Platform administrator before serving authenticated traffic.
    await user_service.ensure_administrator()

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


@app.exception_handler(ServiceError)
async def service_error_response(_request: Request, error: ServiceError):
    """Return expected service failures as API responses."""

    return JSONResponse(status_code=error.status_code, content={"detail": str(error)})


install_frontend_middleware(app)

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
