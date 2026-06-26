from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic_settings import BaseSettings

from longlink.database.audit import install_audit_middleware
from longlink.constants import ROOT
from longlink.routes import routes
from longlink.utils import Envs


class LongLink(FastAPI):
    """FastAPI app that owns SDK service creation and shared request state."""

    def __init__(self, env: BaseSettings | None = None, **kwargs):
        """Build app, initialize managed services, mount routes, and serve the frontend."""
        super().__init__(**kwargs)

        environments = env if isinstance(env, Envs) else Envs()

        for router in routes:
            self.include_router(router)

        install_audit_middleware(self)

        frontend_directory = ROOT / ".static" / "web"

        if frontend_directory.exists():
            assets_directory = frontend_directory / "assets"

            # Serve the built SDK frontend entrypoint without shadowing app routes.
            @self.get("/", include_in_schema=False)
            def frontend_index() -> FileResponse:
                """Return the packaged frontend entry document."""

                return FileResponse(frontend_directory / "index.html")

            # Serve frontend bundles from the generated assets directory.
            if assets_directory.exists():
                self.mount("/assets", StaticFiles(directory=assets_directory), name="assets")

        # Enable CORS in development for local frontend access to API routes
        if environments.ENV == "development":
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
