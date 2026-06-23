from fastapi import FastAPI
from longlink.utils import Envs
from longlink.routes import routes
from pydantic_settings import BaseSettings
from longlink.constants import ROOT
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from longlink.database.audit import install_audit_middleware


class LongLink(FastAPI):
    """FastAPI app that owns SDK service creation and shared request state."""

    def __init__(self, env: BaseSettings | None = None, **kwargs):
        """Build app, initialize managed services, mount routes, and attach static files."""
        super().__init__(**kwargs)

        environments = env if isinstance(env, Envs) else Envs()

        # Register API routes from the router module
        for router in routes:
            self.include_router(router)

        # Mount static files after API routes so metadata and app assets stay reachable.
        static_dir = ROOT / ".static" / "web"
        if static_dir.exists():
            self.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

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
