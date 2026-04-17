from fastapi import FastAPI
from pathlib import Path
from longlink.envs import ENV, get_envs
from longlink.router import api_router
from longlink.routes import sdk_router
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware


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


class LongLink(FastAPI):
    """LongLink SDK FastAPI application with platform defaults attached."""

    def __init__(self, env: ENV | None = None, **kwargs):
        """Create FastAPI app and apply LongLink middleware, routes, and state."""

        super().__init__(**kwargs)
        self.env = env or get_envs()
        self._configure()

    def _configure(self) -> None:
        """Configure middleware, routes, static assets, and LongLink state."""

        # Keep validated env accessible to route handlers and extensions.
        self.state.env = self.env
        self.state.longlink_app = self

        self.add_middleware(
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
        self.include_router(api_router)
        self.include_router(sdk_router)

        static_dir = Path(__file__).resolve().parent / "static"
        if static_dir.exists():
            self.mount(
                "/",
                SPAStaticFiles(directory=static_dir, html=True),
                name="static",
            )


# Backwards-compatible alias while SDK migrates naming to LongLink.
App = LongLink
