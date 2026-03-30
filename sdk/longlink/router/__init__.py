import inspect
from typing import Any, Callable, Awaitable
from .route import Route, PageRoute
from longlink.ui import Page

Handler = Callable[..., Awaitable[Any]]


class Router:
    def __init__(self) -> None:
        self._routes: list[Route] = []
        self._pages: list[PageRoute] = []

    def register(self, router: "Router") -> None:
        self._routes.extend(router._routes)
        self._pages.extend(router._pages)

    def _route(self, method: str, path: str):
        def decorator(func: Handler) -> Handler:
            self._routes.append(Route(method.upper(), path, func))
            return func
        return decorator

    def page(self, path: str, name: str, icon: str):
        def decorator(func: Handler) -> Handler:
            self._pages.append(PageRoute(path, func, name=name, icon=icon))
            self._routes.append(self._pages[-1])
            return func
        return decorator

    def pages(self) -> list[dict[str, str]]:
        return [{"path": page.template, "name": page.name, "icon": page.icon} for page in self._pages]

    def match(self, method: str, path: str, query_string: str = "") -> tuple[Handler | None, dict[str, Any]]:
        full_path = path
        if query_string:
            separator = "&" if "?" in path else "?"
            full_path = f"{path}{separator}{query_string}"

        for route in self._routes:
            if route.method != method.upper():
                continue

            params = route.match(full_path)
            if params is None:
                continue

            sig = inspect.signature(route.handler)
            filtered = {name: value for name, value in params.items() if name in sig.parameters}
            bound = sig.bind_partial(**filtered)
            bound.apply_defaults()
            return route.handler, bound.arguments

        return None, {}

    def _match(self, method: str, path: str, query_string: str = "") -> Handler | None:
        handler, params = self.match(method, path, query_string=query_string)
        if handler is None:
            return None

        async def wrapper(*_):
            return await handler(**params)

        wrapper.__name__ = handler.__name__
        return wrapper

    def get(self, path: str): return self._route("GET", path)
    def post(self, path: str): return self._route("POST", path)
    def put(self, path: str): return self._route("PUT", path)
    def patch(self, path: str): return self._route("PATCH", path)
    def delete(self, path: str): return self._route("DELETE", path)


if __name__ == "__main__":
    router = Router()

    @router.get("/users/{user_id}/posts?{filter}&sort={sort_order}")
    async def get_user_posts(user_id: str, filter: str = "", sort_order: str = "asc"):
        return {"user_id": user_id, "filter": filter, "sort": sort_order}

    @router.page("/settings", name="Settings", icon="settings")
    async def settings_page() -> Page:
        return Page()

    fn, params = router.match("GET", "/users/admin/posts", query_string="filter=any&sort=desc")
    assert fn is not None, "Handler not found for registered route"
    assert fn.__name__ == "get_user_posts", "Handler function name does not match expected"
    assert params == {"user_id": "admin", "filter": "any", "sort_order": "desc"}
    assert router.pages() == [{"path": "/settings", "name": "Settings", "icon": "settings"}]
