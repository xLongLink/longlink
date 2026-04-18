from fastapi import FastAPI
from pathlib import Path
from longlink.state import State, create_state
from longlink.routes import routes
from pydantic_settings import BaseSettings
from fastapi.staticfiles import StaticFiles
from longlink.utils.page import Page
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
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
    state: State

    def __init__(self, env: BaseSettings | None = None, **kwargs):
        """Build app, initialize managed services, mount routes, and attach static files."""
        super().__init__(**kwargs)

        settings = env if isinstance(env, Settings) else Settings()
        self.state = create_state(settings)

        # Mount static files if the directory exists, serving the SPA frontend and assets
        static_dir = Path(__file__).resolve().parent / "static"
        if static_dir.exists():
            self.mount("/", SPAStaticFiles(directory=static_dir, html=True), name="static")

        # Register API routes from the router module
        for router in routes:
            self.include_router(router)
            
        # Enable CORS in development for local frontend access to API routes
        if settings.DEV:
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

    def include_page(self, page: str | Path) -> None:
        """Register XML page file for discovery endpoint."""
        self.state.pages.append(Page(page))

    def include_issues_page(self) -> None:
        """Register the default issues page if it exists."""
        issues_page = Path(__file__).resolve().parent / "pages" / "issues.xml"
        if issues_page.exists():
            self.include_page(issues_page)
