from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from longlink.envs import ENV, get_envs
from longlink.router import api_router


class SPAStaticFiles(StaticFiles):
    """Serve SPA assets and fallback to `index.html` for unknown routes."""

    async def get_response(self, path: str, scope):
        """Return static file response, falling back to SPA entrypoint on 404."""

        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code != 404:
                raise

        return await super().get_response("index.html", scope)


class App:
    """LongLink SDK application wrapper around FastAPI and validated env."""

    def __init__(self, env: ENV, fastapi_app: FastAPI | None = None):
        """Create application wrapper and bind validated env to FastAPI state."""

        self.env = env
        self.fastapi = fastapi_app or FastAPI()
        self._configure()

    def _configure(self) -> None:
        """Configure middleware, routes, static assets, and application state."""

        # Keep validated env accessible to route handlers and extensions.
        self.fastapi.state.env = self.env
        self.fastapi.state.longlink_app = self

        self.fastapi.add_middleware(
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
        self.fastapi.include_router(api_router)

        static_dir = Path(__file__).resolve().parent / "static"
        if static_dir.exists():
            self.fastapi.mount(
                "/",
                SPAStaticFiles(directory=static_dir, html=True),
                name="static",
            )


def create_longlink_app(env: ENV | None = None) -> App:
    """Create LongLink app wrapper with explicit or default environment."""

    return App(env=env or get_envs())


def create_app(env: ENV | None = None) -> FastAPI:
    """Create and return FastAPI application for backwards compatibility."""

    return create_longlink_app(env=env).fastapi
