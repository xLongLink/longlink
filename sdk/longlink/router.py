from fastapi import APIRouter


class Router(APIRouter):
    """FastAPI router wrapper with SDK hook points."""

    def add_api_route(self, path: str, endpoint, **kwargs):
        """Register a route and run SDK-specific route hooks."""

        route = super().add_api_route(path, endpoint, **kwargs)
        self.on_route_registered(path=path, endpoint=endpoint, route=route)
        return route

    def include_router(self, router, **kwargs):
        """Include a nested router and run SDK-specific include hooks."""

        self.on_router_included(router=router, include_kwargs=kwargs)
        return super().include_router(router, **kwargs)

    def on_route_registered(self, path: str, endpoint, route) -> None:
        """Hook for SDK code that needs to react to route registration."""

    def on_router_included(self, router, include_kwargs: dict) -> None:
        """Hook for SDK code that needs to react to nested router inclusion."""
