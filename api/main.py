import asyncio
import contextlib
from fastapi import FastAPI
from pathlib import Path
from src.routes import auth, icons, image, users, health, accounts, branding, computes, storages, countries, databases, locations
from src.routes import operations as operations_route
from src.routes import applications, organizations
from src.database.services import operations
from src.operations import locations as operation_locations
from src.utils.jobs import run_operation_scheduler
from collections.abc import AsyncIterator
from src.environments import env
from longlink.middleware import install_frontend_middleware
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Validate release compatibility, then run this API replica's scheduler and periodic reconciliation scan."""

    await operations.reject_platform_downgrade()
    worker = asyncio.create_task(run_operation_scheduler(operation_locations.reconcile))
    reconciler = asyncio.create_task(operation_locations.run_periodic_reconciliation())
    yield

    reconciler.cancel()
    worker.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await asyncio.gather(worker, reconciler)


app = FastAPI(
    lifespan=lifespan,
    docs_url=None,
    redoc_url="/redocs",
    openapi_url="/openapi.json",
)


app.add_middleware(
    SessionMiddleware,
    secret_key=env.SESSION_KEY,
    session_cookie="longlink_session",
    same_site="lax",
    https_only=not env.DEVELOPMENT,
)
install_frontend_middleware(app)

# Register API routes after constructing the application.
app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(applications.router)
app.include_router(branding.router)
app.include_router(computes.router)
app.include_router(countries.router)
app.include_router(databases.router)
app.include_router(health.router)
app.include_router(icons.router)
app.include_router(image.router)
app.include_router(locations.router)
app.include_router(operations_route.router)
app.include_router(organizations.router)
app.include_router(storages.router)
app.include_router(users.router)


static_dir = Path(__file__).resolve().parent / "src" / ".static" / "web"
if static_dir.exists():
    app.frontend("/", directory=static_dir)

# Local development entrypoint. Production imports the app with Gunicorn, so this block is not executed.
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

    uvicorn.run(app, host="0.0.0.0", port=8000)
