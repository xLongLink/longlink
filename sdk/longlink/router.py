from typing import Any
from fastapi import APIRouter
from collections.abc import Callable


class Router(APIRouter):
    """Placeholder — reserved for future custom middleware or routing behavior."""

    def add_api_route(self, path: str, endpoint: Callable[..., Any], **kwargs: Any) -> None:
        """Register a route."""

        return super().add_api_route(path, endpoint, **kwargs)

    def include_router(self, router: APIRouter, **kwargs: Any) -> None:
        """Include a nested router."""

        return super().include_router(router, **kwargs)
