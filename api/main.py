from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pathlib import Path
from urllib.parse import urlsplit
from src.env import env
from src.routes import routers
from src.routes.auth import router as auth_router
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


app = FastAPI(
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


@app.exception_handler(StarletteHTTPException)
async def handle_http_exception(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Wrap FastAPI HTTP errors in the shared API envelope."""

    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "detail": exc.detail, "data": None},
    )


@app.exception_handler(RequestValidationError)
async def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Wrap validation errors in the shared API envelope."""

    return JSONResponse(
        status_code=422,
        content={"success": False, "detail": exc.errors(), "data": None},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        f"{urlsplit(env.URL).scheme}://{urlsplit(env.URL).netloc}",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    SessionMiddleware,
    secret_key=env.SESSION_KEY,
    session_cookie="longlink_session",
    # Allow the web app to call the API after a cross-origin OIDC round-trip.
    same_site="none" if env.URL.startswith("https://") else "lax",
    https_only=env.URL.startswith("https://"),
)


# Register routers
app.include_router(auth_router)

for router in routers:
    if router is auth_router:
        continue
    app.include_router(router)

static_dir = Path(__file__).resolve().parent / "src" / ".static" / "web"
if static_dir.exists():
    app.mount("/", SPAStaticFiles(directory=static_dir, html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000)
