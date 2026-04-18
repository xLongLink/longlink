from fastapi import FastAPI
from pathlib import Path
from longlink.state import State, create_state
from longlink.utils import Page, Settings
from longlink.routes import routes
from pydantic_settings import BaseSettings
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware


class SPAStaticFiles(StaticFiles):
    """Serve SPA assets and fall back to `index.html` for unknown routes."""

    async def get_response(self, path: str, scope):
        """Return static file response, falling back to SPA entrypoint on 404."""

        try:
            return await super().get_response(path, scope)
        except HTTPException as exc:
            if exc.status_code != 404:
                raise

        method = scope.get("method", "").upper()
        headers = dict(scope.get("headers", []))
        accept_header = headers.get(b"accept", b"").decode("latin-1").lower()

        # Only serve SPA fallback for browser navigations that explicitly accept HTML.
        if method != "GET" or "text/html" not in accept_header:
            raise exc

        return await super().get_response("index.html", scope)



class LongLink(FastAPI):
    """FastAPI app that owns SDK service creation and shared request state."""
    context: State

    def __init__(self, env: BaseSettings | None = None, **kwargs):
        """Build app, initialize managed services, mount routes, and attach static files."""
        super().__init__(**kwargs)

        settings = env if isinstance(env, Settings) else Settings()
        self.context = create_state(settings)
        self.state.context = self.context

        # Register API routes from the router module
        for router in routes:
            self.include_router(router)

        # Mount static files after API routes so `/pages` and other SDK endpoints stay reachable.
        static_dir = Path(__file__).resolve().parent / "static"
        if static_dir.exists():
            self.mount("/", SPAStaticFiles(directory=static_dir, html=True), name="static")
            
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
        page_path = Path(page)
        candidate_paths: list[Path] = []

        # Resolve non-existent declarations against common app roots used by sample projects.
        if not page_path.exists():
            normalized_page_path = (
                page_path.relative_to(page_path.anchor)
                if page_path.is_absolute()
                else page_path
            )
            candidate_paths = [
                Path.cwd() / normalized_page_path,
                Path.cwd() / "app" / normalized_page_path,
            ]

        for candidate in candidate_paths:
            if candidate.exists():
                page_path = candidate
                break

        self.context.pages.append(Page(page_path))

    def include_issues_page(self) -> None:
        """Register the default issues page if it exists."""
        issues_page = Path(__file__).resolve().parent / "pages" / "issues.xml"
        if issues_page.exists():
            self.include_page(issues_page)
