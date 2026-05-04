import traceback
from fastapi import FastAPI, Request
from pathlib import Path
from longlink.utils import Page, Environments
from longlink.routes import routes
from fastapi.responses import JSONResponse
from pydantic_settings import BaseSettings
from longlink.constants import ROOT
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware


class SPAStaticFiles(StaticFiles):
    """Serve SPA assets and fall back to `index.html` for unknown routes."""

    async def get_response(self, path: str, scope):
        """Return static file response, falling back to SPA entrypoint on 404."""

        not_found_exc: HTTPException | None = None

        try:
            return await super().get_response(path, scope)
        except HTTPException as exc:
            if exc.status_code != 404:
                raise
            not_found_exc = exc

        method = scope.get("method", "").upper()
        headers = dict(scope.get("headers", []))
        accept_header = headers.get(b"accept", b"").decode("latin-1").lower()

        # Only serve SPA fallback for browser navigations that explicitly accept HTML.
        if method != "GET" or "text/html" not in accept_header:
            if not_found_exc is not None:
                raise not_found_exc
            raise HTTPException(status_code=404)

        return await super().get_response("index.html", scope)



class LongLink(FastAPI):
    """FastAPI app that owns SDK service creation and shared request state."""

    def __init__(self, env: BaseSettings | None = None, **kwargs):
        """Build app, initialize managed services, mount routes, and attach static files."""
        super().__init__(**kwargs)

        environments = env if isinstance(env, Environments) else Environments()
        self.state.page_roots = []

        # Register API routes from the router module
        for router in routes:
            self.include_router(router)

        # Mount static files after API routes so metadata and app assets stay reachable.
        static_dir = ROOT / ".static" / "web"
        if static_dir.exists():
            self.mount("/", SPAStaticFiles(directory=static_dir, html=True), name="static")

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

        self.add_exception_handler(HTTPException, self._handle_http_exception)
        self.add_exception_handler(Exception, self._handle_unexpected_exception)

    async def _handle_http_exception(self, request: Request, exc: HTTPException) -> JSONResponse:
        """Return structured error response for HTTP exceptions."""

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.detail,
                "status_code": exc.status_code,
            },
        )

    async def _handle_unexpected_exception(self, request: Request, exc: Exception) -> JSONResponse:
        """Return detailed error response for unhandled exceptions, including traceback."""

        tb_lines = traceback.format_exception(type(exc), exc, exc.__traceback__)
        error_detail = "".join(tb_lines)

        return JSONResponse(
            status_code=500,
            content={
                "error": str(exc),
                "error_type": type(exc).__name__,
                "traceback": error_detail,
            },
        )

    def include_page(self, page: str | Path) -> None:
        """Register a page folder so nested XML pages are discovered by path."""

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

        page_root = page_path.parent if page_path.is_file() else page_path
        self.state.page_roots.append(page_root.resolve())
