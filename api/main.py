import asyncio
from fastapi import FastAPI, Request
from pathlib import Path
from contextlib import suppress, asynccontextmanager
from src.logger import logger
from src.router import router
from src.operations import execute
from src.environments import env
from src.errors import register_error_handlers
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from src.database.services.operations import operations


class SPAStaticFiles(StaticFiles):
    """Static file server that serves index.html for unmatched SPA routes."""

    async def get_response(self, path: str, scope):
        """Serve `index.html` for non-API paths that miss static assets."""

        # Let organization-scoped API paths fall through as real 404s instead of SPA navigation.
        if "api" in path.split("/"):
            return await super().get_response(path, scope)

        try:
            response = await super().get_response(path, scope)
        except HTTPException as exc:
            if exc.status_code != 404:
                raise
            response = await super().get_response("index.html", scope)

        return response


async def run_operation_scheduler() -> None:
    """Continuously claim and execute scheduled operations."""

    # Keep polling the queue so new claimed operations are drained continuously.
    while True:
        operation = await operations.claim_next()
        if operation is None:
            await asyncio.sleep(1)
            continue

        logger.info("Executing operation %s (%s)", operation.id, operation.kind)
        # Execute one claimed operation without stopping the worker on failure.
        try:
            result = await execute(operation)
            if result.started_at is None and result.stopped_at is None and result.step == operation.step:
                await asyncio.sleep(1)
        except Exception:
            # Keep draining so one failed operation does not block the queue.
            logger.exception("Operation scheduler failed for %s (%s)", operation.id, operation.kind)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start the API and background operation worker."""

    await operations.reset_active()

    worker = asyncio.create_task(run_operation_scheduler())
    yield

    worker.cancel()
    with suppress(asyncio.CancelledError):
        await worker


app = FastAPI(
    lifespan=lifespan,
    docs_url=None,
    redoc_url="/redocs",
    openapi_url="/openapi.json",
)

register_error_handlers(app)


app.add_middleware(
    SessionMiddleware,
    secret_key=env.SESSION_KEY,
    session_cookie="longlink_session",
    same_site="lax",
    https_only=False,
)

import src.routes.auth
import src.routes.user
import src.routes.image
import src.routes.proxy
import src.routes.health
import src.routes.compute
import src.routes.storage
import src.routes.database
import src.routes.locations
import src.routes.operations
import src.routes.applications
import src.routes.organizations

# Register API routes after importing the endpoint modules so their decorators run.
app.include_router(router)


static_dir = Path(__file__).resolve().parent / "src" / ".static" / "web"
if static_dir.exists():
    app.mount("/", SPAStaticFiles(directory=static_dir, html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:8000",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    uvicorn.run("main:app", host="0.0.0.0", port=8000)
