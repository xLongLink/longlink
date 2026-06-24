from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic_settings import BaseSettings

from longlink.constants import ROOT
from longlink.database.audit import install_audit_middleware
from longlink.routes import router
from longlink.utils import Envs


class LongLink(FastAPI):
    """FastAPI app that owns SDK service creation and shared request state."""

    def __init__(self, env: BaseSettings | None = None, **kwargs):
        """Build app, initialize managed services, mount routes, and serve the frontend."""
        super().__init__(**kwargs)

        environments = env if isinstance(env, Envs) else Envs()

        self.include_router(router)

        # Serve packaged frontend files after API routes so app paths still win.
        static_dir = ROOT / ".static" / "web"
        if static_dir.exists():
            self.frontend("/", directory=str(static_dir))

        install_audit_middleware(self)

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
