from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic_settings import BaseSettings
from starlette.exceptions import HTTPException as StarletteHTTPException

from longlink.context import State, build_state
from longlink.routes import routes
from longlink.utils.page import Page
from longlink.utils.settings import Settings


class SPAStaticFiles(StaticFiles):
    """Serve SPA assets and fall back to `index.html` for unknown routes."""

    async def get_response(self, path: str, scope):
        """Return static file response, falling back to SPA entrypoint on 404."""

        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            if exc.status_code != 404:
                raise

        return await super().get_response("index.html", scope)


class LongLink(FastAPI):
    """FastAPI app that owns SDK service creation and shared request state."""

    def __init__(self, env: BaseSettings | None = None, **kwargs):
        """Build app, initialize managed services, mount routes, and attach static files."""

        super().__init__(**kwargs)

        settings = env if isinstance(env, Settings) else Settings()
        self.state.context = build_state(settings)
        self.state.pages = self.state.context.pages

        for router in routes:
            self.include_router(router)

        if self.state.context.env.DEV:
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

        static_dir = Path(__file__).resolve().parent / "static"
        if static_dir.exists():
            self.mount("/", SPAStaticFiles(directory=static_dir, html=True), name="static")

    def include_page(self, page: str | Path) -> None:
        """Register XML page file for discovery endpoint."""

        self.state.pages.append(Page(page))
