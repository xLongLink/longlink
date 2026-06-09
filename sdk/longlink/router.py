from fastapi import APIRouter


class Router(APIRouter):
    """Placeholder — reserved for future custom middleware or routing behavior."""

    def add_api_route(self, path: str, endpoint, **kwargs):
        """Register a route."""

        return super().add_api_route(path, endpoint, **kwargs)

    def include_router(self, router, **kwargs):
        """Include a nested router."""

        return super().include_router(router, **kwargs)

    def page(self, path: str):
        """Register a GET route that serves an XML page."""

        from longlink.pages import PageDefinition, XMLResponse, _normalize_page_path, page_registry

        normalized_path = _normalize_page_path(path)

        def decorator(endpoint):
            """Attach the endpoint to the router and page registry."""

            # Keep page metadata available for `metadata.json`.
            page_registry.append(PageDefinition(path=normalized_path, handler=endpoint))

            # Register the XML page endpoint on this router.
            self.add_api_route(normalized_path, endpoint, methods=["GET"], response_class=XMLResponse)
            return endpoint

        return decorator
