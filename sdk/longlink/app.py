from fastapi import FastAPI
from pathlib import Path
from longlink.routes import sdk_router
from fastapi.responses import Response
from pydantic_settings import BaseSettings
from fastapi.staticfiles import StaticFiles
from longlink.utils.page import Page
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

    def __init__(self, env: BaseSettings | None = None, **kwargs):
        """Create FastAPI app and apply LongLink middleware, routes, and state."""
        super().__init__(**kwargs)

        # Keep shared runtime state for SDK routes.
        self.state.env = env
        self.state.pages: list[dict[str, str]] = []

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
        self.include_router(sdk_router)

        static_dir = Path(__file__).resolve().parent / "static"
        if static_dir.exists():
            self.mount("/", SPAStaticFiles(directory=static_dir, html=True), name="static")

    def include_page(self, page: str | Path) -> None:
        """Register XML page file and expose it through a generated `/pages/*` route."""

        page_file = Page(page)
        page_content = page_file.load_page_schema()
        metadata = page_file.load_page_metadata()

        page_path = page_file.path.stem

        # Persist page metadata for discovery endpoint.
        self.state.pages.append(
            {
                "path": f"/pages/{page_path}",
                "name": metadata.get("name", page_path.replace("_", " ").title()),
                "icon": metadata.get("icon", "FileText"),
            }
        )
