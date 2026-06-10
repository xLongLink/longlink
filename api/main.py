from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from pathlib import Path

from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from src.env import env
from src.logger import logger
from src.database.services.operations import operations
from src.operations import complete_ready_operations, execute_claimed_operation, recover_active_operations
from src.router import router
from starlette.exceptions import HTTPException
from starlette.middleware.sessions import SessionMiddleware


class SPAStaticFiles(StaticFiles):
    """Static file server that serves index.html for unmatched SPA routes."""

    async def get_response(self, path: str, scope):
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Drain any queued operations before the API starts serving traffic."""

    logger.info("Starting operation drain")
    await recover_active_operations()

    while True:
        operation = await operations.claim_next()
        if operation is None:
            break

        logger.info("Executing operation %s (%s)", operation.id, operation.kind)
        try:
            await execute_claimed_operation(operation)
        except Exception:
            # Keep draining so one failed operation does not block the queue.
            logger.exception("Operation drain failed for %s (%s)", operation.id, operation.kind)
            continue

    # Finalize any operations that only need a readiness check.
    await complete_ready_operations()
    logger.info("Finished operation drain")
    yield


app = FastAPI(
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
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

import src.routes.applications 
import src.routes.auth
import src.routes.compute
import src.routes.database
import src.routes.health
import src.routes.image
import src.routes.locations
import src.routes.operations
import src.routes.organizations
import src.routes.proxy 
import src.routes.storage 
import src.routes.user

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
