import json
import traceback
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response
from longlink.utils import Environments
from longlink.routes import routes
from pydantic_settings import BaseSettings
from longlink.constants import ROOT
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware


class SPAStaticFiles(StaticFiles):
    """Serve SPA assets and fall back to `index.html` for unknown routes."""

    def __init__(self, *args, base_url: str = "", directory: str | Path | None = None, **kwargs):
        """Remember the mounted directory and runtime base URL."""

        super().__init__(*args, directory=directory, **kwargs)
        self._directory = Path(directory) if directory is not None else None
        self._base_url = base_url.rstrip("/") + "/" if base_url else "/"

    def _index_response(self) -> Response:
        """Return the rewritten SPA entrypoint for the active base URL."""

        if self._directory is None:
            raise HTTPException(status_code=404)

        index_path = self._directory / "index.html"
        content = index_path.read_text(encoding="utf-8")
        content = content.replace('href="/favicon.ico"', f'href="{self._base_url}favicon.ico"')
        content = content.replace('src="/assets/', f'src="{self._base_url}assets/')
        content = content.replace('href="/assets/', f'href="{self._base_url}assets/')
        content = content.replace(
            "</head>",
            f'<script>window.__LONGLINK_BASEURL__ = {json.dumps(self._base_url)};</script></head>',
        )

        return Response(content=content, media_type="text/html")

    async def get_response(self, path: str, scope):
        """Return static file response, falling back to SPA entrypoint on 404."""

        if path in {"", "/", "index.html"}:
            return self._index_response()

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

        return self._index_response()



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
            self.mount("/", SPAStaticFiles(directory=static_dir, html=True, base_url=environments.BASEURL), name="static")

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
