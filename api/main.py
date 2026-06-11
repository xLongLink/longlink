import asyncio
from fastapi import FastAPI, Request
from pathlib import Path
from src.env import env
from contextlib import suppress, asynccontextmanager
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine
from src.logger import logger
from src.router import router
from src.operations import (complete_ready_operations,
                            execute_claimed_operation,
                            recover_active_operations)
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from src.database.models.__base__ import Base
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
            await execute_claimed_operation(operation)
        except Exception:
            # Keep draining so one failed operation does not block the queue.
            logger.exception("Operation scheduler failed for %s (%s)", operation.id, operation.kind)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Drain any queued operations before the API starts serving traffic."""

    # Local SQLite development starts from an empty file, so create the schema before any reads.
    database_url = make_url(env.DATABASE_URL)
    if database_url.drivername.startswith("sqlite+"):
        engine = create_async_engine(database_url)
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        finally:
            await engine.dispose()

    logger.info("Starting operation drain")
    await recover_active_operations()

    # Drain boot-time work before the app starts serving requests.
    while True:
        operation = await operations.claim_next()
        if operation is None:
            break

        logger.info("Executing operation %s (%s)", operation.id, operation.kind)
        # Keep draining even if one startup operation fails.
        try:
            await execute_claimed_operation(operation)
        except Exception:
            # Keep draining so one failed operation does not block the queue.
            logger.exception("Operation drain failed for %s (%s)", operation.id, operation.kind)
            continue

    # Finalize any operations that only need a readiness check.
    await complete_ready_operations()
    logger.info("Finished operation drain")

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


@app.exception_handler(HTTPException)
@app.exception_handler(RequestValidationError)
async def handle_api_error(_request: Request, exc: Exception) -> JSONResponse:
    """Wrap API errors in the shared envelope."""

    if isinstance(exc, RequestValidationError):
        detail = "; ".join(error["msg"] for error in exc.errors()) or "Validation error"
        status_code = 422
    else:
        detail = "" if getattr(exc, "detail", None) is None else str(exc.detail)
        status_code = exc.status_code

    return JSONResponse(status_code=status_code, content={"success": False, "detail": detail, "data": None})


app.add_middleware(
    SessionMiddleware,
    secret_key=env.SESSION_KEY,
    session_cookie="longlink_session",
    same_site="lax",
    https_only=False,
)

import src.routes.health
import src.routes.auth
import src.routes.user
import src.routes.image
import src.routes.proxy
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
