import inspect
from typing import Any, Callable, Awaitable
from .route import Route, PageRoute

Handler = Callable[..., Awaitable[Any]]

_routes: list[Route] = []
_pages: list[PageRoute] = []


def route(path: str, methods: list[str] | None = None):
    normalized_methods = methods or ["GET"]

    def decorator(func: Handler) -> Handler:
        for method in normalized_methods:
            _routes.append(Route(method.upper(), path, func))
        return func

    return decorator


def page(path: str, name: str, icon: str):
    def decorator(func: Handler) -> Handler:
        _pages.append(PageRoute(path, func, name=name, icon=icon))
        _routes.append(_pages[-1])
        return func

    return decorator


def pages() -> list[dict[str, str]]:
    return [{"path": page.template, "name": page.name, "icon": page.icon} for page in _pages]


def match(method: str, path: str, query_string: str = "") -> tuple[Handler | None, dict[str, Any]]:
    full_path = path
    if query_string:
        separator = "&" if "?" in path else "?"
        full_path = f"{path}{separator}{query_string}"

    for registered_route in _routes:
        if registered_route.method != method.upper():
            continue

        params = registered_route.match(full_path)
        if params is None:
            continue

        sig = inspect.signature(registered_route.handler)
        filtered = {name: value for name, value in params.items() if name in sig.parameters}
        bound = sig.bind_partial(**filtered)
        bound.apply_defaults()
        return registered_route.handler, bound.arguments

    return None, {}


def is_page_handler(handler: Handler) -> bool:
    return any(route.handler is handler for route in _pages)


def get(path: str): return route(path, ["GET"])
def post(path: str): return route(path, ["POST"])
def put(path: str): return route(path, ["PUT"])
def patch(path: str): return route(path, ["PATCH"])
def delete(path: str): return route(path, ["DELETE"])
