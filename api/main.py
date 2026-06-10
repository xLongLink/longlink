from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from pathlib import Path

from src.operations import execute
from src.env import env
from src.router import router
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware


class SPAStaticFiles(StaticFiles):
    """Static file server that serves index.html for unmatched SPA routes."""

    async def get_response(self, path: str, scope):
        # Let organization-scoped API paths fall through as real 404s instead of SPA navigation.
        if "api" in path.split("/"):
            return await super().get_response(path, scope)

        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code != 404:
                raise

        return await super().get_response("index.html", scope)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Drain any queued operations before the API starts serving traffic."""

    await execute()
    yield


app = FastAPI(
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


@app.exception_handler(StarletteHTTPException)
async def handle_http_exception(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Wrap FastAPI HTTP errors in the shared API envelope."""

    detail = "" if exc.detail is None else str(exc.detail)

    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "detail": detail, "data": None},
    )


@app.exception_handler(RequestValidationError)
async def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Wrap validation errors in the shared API envelope."""

    detail = "; ".join(error["msg"] for error in exc.errors()) or "Validation error"

    return JSONResponse(
        status_code=422,
        content={"success": False, "detail": detail, "data": None},
    )


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
app.add_middleware(
    SessionMiddleware,
    secret_key=env.SESSION_KEY,
    session_cookie="longlink_session",
    same_site="lax",
    https_only=False,
)

import src.routes.apps 
import src.routes.auth
import src.routes.compute
import src.routes.database
import src.routes.health
import src.routes.image
import src.routes.locations
import src.routes.operations
import src.routes.orgs
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

    uvicorn.run("main:app", host="0.0.0.0", port=8000)
