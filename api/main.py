import asyncio
import contextlib
from uuid import UUID
from alembic import command
from fastapi import FastAPI
from pathlib import Path
from src.errors import register_error_handlers
from src.logger import logger
from src.routes import (
    auth,
    icons,
    image,
    users,
    health,
    accounts,
    branding,
    computes,
    storages,
    databases,
    locations,
)
from src.routes import operations as operations_route
from src.routes import applications, organizations
from alembic.config import Config
from src.operations import execute
from collections.abc import AsyncIterator
from src.environments import env, resolve_cors_origins, validate_production_settings
import src.utils.url as url
from sqlalchemy.engine import make_url
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from src.database.services import operations


async def renew_operation_lease(operation_id: UUID, lease_token: str) -> None:
    """Keep one claimed operation leased while the current worker executes it."""

    while True:
        await asyncio.sleep(max(1, env.OPERATION_HEARTBEAT_SECONDS))
        renewed = await operations.renew_lease(operation_id, lease_token)
        if renewed is None:
            logger.warning("Operation %s lease was lost", operation_id)
            return


async def run_operation_scheduler() -> None:
    """Continuously claim and execute scheduled operations."""

    # Keep polling the queue so new claimed operations are drained continuously.
    while True:
        operation = await operations.claim_next()
        if operation is None:
            await asyncio.sleep(1)
            continue

        logger.info("Executing operation %s (%s)", operation.id, operation.kind)
        if operation.lease_token is None:
            logger.warning("Skipping operation %s without a lease token", operation.id)
            continue

        heartbeat = asyncio.create_task(renew_operation_lease(operation.id, operation.lease_token))
        # Execute one claimed operation without stopping the worker on failure.
        try:
            result = await execute(operation)
            if result.started_at is None and result.stopped_at is None and result.step == operation.step:
                await asyncio.sleep(1)
        except Exception:
            # Keep draining so one failed operation does not block the queue.
            logger.exception("Operation scheduler failed for %s (%s)", operation.id, operation.kind)
        finally:
            heartbeat.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await heartbeat


async def migrate_development_sqlite_database() -> None:
    """Apply Alembic migrations for local SQLite development databases."""

    database_url = make_url(url.database(env.DATABASE_URL))
    if not env.DEVELOPMENT or not database_url.drivername.startswith("sqlite"):
        return

    # Alembic's async environment uses asyncio.run(), so execute it outside the
    # running ASGI event loop.
    config = Config(str(Path(__file__).with_name("alembic.ini")))
    await asyncio.to_thread(command.upgrade, config, "head")


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Start the API and background operation worker."""

    await migrate_development_sqlite_database()
    worker = asyncio.create_task(run_operation_scheduler())
    yield

    worker.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await worker


validate_production_settings(env)

app = FastAPI(
    lifespan=lifespan,
    docs_url=None,
    redoc_url="/redocs",
    openapi_url="/openapi.json",
)

register_error_handlers(app)


def configure_cors(application: FastAPI, origins: tuple[str, ...]) -> list[str]:
    """Add credentialed CORS middleware for configured origins."""

    cors_origins = [origin for origin in origins if origin]
    if not cors_origins:
        return []

    application.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    return cors_origins


app.add_middleware(
    SessionMiddleware,
    secret_key=env.SESSION_KEY,
    session_cookie="longlink_session",
    same_site="lax",
    https_only=not env.DEVELOPMENT,
)

cors_origins = configure_cors(app, resolve_cors_origins(env.DEVELOPMENT, env.CORS_ORIGINS))

# Register API routes after importing the endpoint modules so their decorators run.
app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(applications.router)
app.include_router(branding.router)
app.include_router(computes.router)
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000)
