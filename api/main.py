import asyncio
import contextlib
from src import operations as _
from fastapi import FastAPI
from pathlib import Path
from src.utils import jobs
from src.routes import auth, icons, image, proxy, users, health, branding, computes, storages, databases
from src.routes import operations as operations_route
from src.routes import applications, organizations
from collections.abc import AsyncGenerator
from src.environments import env
from fastapi.responses import FileResponse
from longlink.middleware import install_frontend_middleware
from fastapi.middleware.cors import CORSMiddleware


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Run this API replica's registered Operation scheduler."""

    # Validate every Operation handler before starting this replica's scheduler.
    jobs.validate_handlers()
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
    redoc_url="/redocs",
    openapi_url="/openapi.json",
)


install_frontend_middleware(app)

# Register API routes after constructing the application.
app.include_router(auth.router)
app.include_router(applications.router)
app.include_router(proxy.router)
app.include_router(branding.router)
app.include_router(computes.router)
app.include_router(databases.router)
app.include_router(health.router)
app.include_router(icons.router)
app.include_router(image.router)
app.include_router(operations_route.router)
app.include_router(organizations.router)
app.include_router(storages.router)
app.include_router(users.router)


static_dir = Path(__file__).resolve().parent / "src" / ".static" / "web"
if static_dir.exists():

    # Serve the prerendered home document before registering the generic SPA fallback.
    @app.get("/", response_class=FileResponse, include_in_schema=False)
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
