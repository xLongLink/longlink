from fastapi import APIRouter


class Router(APIRouter):
    """Placeholder — reserved for future custom middleware or routing behavior."""

    def add_api_route(self, path: str, endpoint, **kwargs):
        """Register a route."""

        return super().add_api_route(path, endpoint, **kwargs)

    def include_router(self, router, **kwargs):
        """Include a nested router."""

        return super().include_router(router, **kwargs)
