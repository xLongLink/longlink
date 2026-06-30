from typing import Any
from fastapi import FastAPI
from pathlib import Path
from longlink.pages import (XMLResponse, PageDefinition, page_registry,
                            normalize_page_path, extract_longlink_metadata)
from longlink.utils import Envs
from longlink.routes import routes
from fastapi.responses import FileResponse
from pydantic_settings import BaseSettings
from longlink.constants import ROOT
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from longlink.database.audit import install_audit_middleware


def normalize_mount_path(path: str) -> str:
    """Normalize an SDK-managed mount path."""

    normalized_path = path.strip()
    if not normalized_path:
        raise ValueError("Mount path is required")

    if not normalized_path.startswith("/"):
        normalized_path = f"/{normalized_path}"

    return normalized_path.rstrip("/") or "/"


def default_source_directory(route_path: str) -> Path:
    """Return the default source directory for one SDK-managed route path."""

    return Path.cwd() / "src" / route_path.strip("/")


class LongLink(FastAPI):
    """FastAPI app that owns SDK service creation and shared request state."""

    def __init__(
        self,
        env: BaseSettings | None = None,
        i18n: str | None = "/i18n",
        pages: str | None = "/pages",
        **kwargs: Any,
    ) -> None:
        """Build app, initialize managed services, mount routes, and serve the frontend."""
        super().__init__(**kwargs)

        environments = env if isinstance(env, Envs) else Envs()
        self.state.page_registry = list(page_registry)

        for router in routes:
            self.include_router(router)

        install_audit_middleware(self)

        frontend_directory = ROOT / ".static" / "web"

        if i18n is not None:
            i18n_path = normalize_mount_path(i18n)
            translations_directory = default_source_directory(i18n_path)

            # Serve the bundled translation catalog from the application itself.
            if translations_directory.exists():
                self.mount(i18n_path, StaticFiles(directory=translations_directory), name="translations")

        if pages is not None:
            pages_path = normalize_mount_path(pages)
            pages_directory = default_source_directory(pages_path)

            if pages_directory.exists():
                self.register_page_directory(pages_path, pages_directory)

        if frontend_directory.exists():
            assets_directory = frontend_directory / "assets"

            # Serve the built SDK frontend entrypoint without shadowing app routes.
            def frontend_index() -> FileResponse:
                """Return the packaged frontend entry document."""

                return FileResponse(frontend_directory / "index.html")

            self.add_api_route("/", frontend_index, methods=["GET"], include_in_schema=False)

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


    def register_page_directory(self, route_prefix: str, pages_directory: Path) -> None:
        """Register XML files from a directory as SDK pages."""

        normalized_prefix = normalize_mount_path(route_prefix)
        registered_pages: list[PageDefinition] = self.state.page_registry
        registered_pages[:] = [
            page for page in registered_pages if not page.path.startswith(f"{normalized_prefix}/")
        ]

        for page_file in sorted(pages_directory.rglob("*.xml")):
            relative_path = page_file.relative_to(pages_directory).as_posix()
            route_path = f"{normalized_prefix}/{relative_path}"
            page_content = page_file.read_text(encoding="utf-8")
            page_name, page_icon = extract_longlink_metadata(page_content)

            async def page_endpoint(page_path: Path = page_file) -> str:
                """Return XML page content from disk."""

                return page_path.read_text(encoding="utf-8")

            registered_path = normalize_page_path(route_path)
            registered_pages.append(
                PageDefinition(
                    path=registered_path,
                    handler=page_endpoint,
                    name=page_name,
                    icon=page_icon,
                )
            )
            self.add_api_route(
                registered_path,
                page_endpoint,
                methods=["GET"],
                response_class=XMLResponse,
                include_in_schema=False,
            )
