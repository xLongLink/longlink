from fastapi import APIRouter


class Router(APIRouter):
    """FastAPI router wrapper for future extensibility."""

    def add_api_route(self, path: str, endpoint, **kwargs):
        """Register a route."""

        return super().add_api_route(path, endpoint, **kwargs)

    def include_router(self, router, **kwargs):
        """Include a nested router."""

        return super().include_router(router, **kwargs)
