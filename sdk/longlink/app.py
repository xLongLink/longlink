from __future__ import annotations
import fsspec
from typing import Any
from fastapi import FastAPI
from pathlib import Path
from pydantic import BaseModel
from longlink.routes import routes
from fastapi.responses import Response
from pydantic_settings import BaseSettings
from fastapi.staticfiles import StaticFiles
from longlink.utils.page import Page
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Annotated
from fastapi import Depends, Request
from sqlmodel import Session
from dataclasses import dataclass
from longlink.storage import Storage,
from longlink.utils.settings import Settings, get_env
from longlink.utils.organization import Organization
from sqlalchemy.engine import Engine


@dataclass
class State:
    """Request context exposing SDK dependencies and aliases."""
    pages: list[Page] = []

    env: Settings
    org: Organization
    engine: Engine
    storage: Storage
    


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

        engine = create_engine(env, echo=False)

        # Keep shared runtime state for SDK routes.
        self.state = State(
            org=Organization(),
            env=env,
            engine=engine,
            storage=get_storage(fs),
            session=get_session(engine),
            request=None,  # Populated per-request in dependency.
        )

        for router in routes:
            self.include_router(router)

        if env.DEV:
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
        """Register XML page file and expose it through a generated `/pages/*` route."""
        # Persist page metadata for discovery endpoint.
        self.state.pages.append(Page(page))


def get_context(request: Request) -> State:
    """Build request context from settings, organization, storage, and DB dependencies."""
    return []


Context = Annotated[State, Depends(get_context)]
