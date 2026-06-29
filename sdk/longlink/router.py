from typing import Any, Callable

from fastapi import APIRouter


class Router(APIRouter):
    """Placeholder — reserved for future custom middleware or routing behavior."""

    def add_api_route(self, path: str, endpoint: Callable[..., Any], **kwargs: Any) -> None:
        """Register a route."""

        return super().add_api_route(path, endpoint, **kwargs)

    def include_router(self, router: APIRouter, **kwargs: Any) -> None:
        """Include a nested router."""

        return super().include_router(router, **kwargs)

    def page(self, path: str) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
        """Register a GET route that serves an XML page."""

        from longlink.pages import XMLResponse, register_page

        normalized_path = path

        def decorator(endpoint: Callable[..., Any]) -> Callable[..., Any]:
            """Attach the endpoint to the router and page registry."""

            # Keep page metadata available for `metadata.json`.
            registered_path = register_page(normalized_path, endpoint)

            # Register the XML page endpoint on this router.
            self.add_api_route(registered_path, endpoint, methods=["GET"], response_class=XMLResponse)
            return endpoint

        return decorator
