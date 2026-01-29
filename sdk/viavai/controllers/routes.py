from typing import Callable, Awaitable, Any

Handler = Callable[..., Awaitable[Any]]

routes: dict[tuple[str, str], Handler] = {}


def _route(method: str, path: str):
    def decorator(func: Handler) -> Handler:
        routes[(method.upper(), path)] = func
        return func
    return decorator


def get(path: str):
    return _route("GET", path)


def post(path: str):
    return _route("POST", path)


def put(path: str):
    return _route("PUT", path)


def patch(path: str):
    return _route("PATCH", path)


def delete(path: str):
    return _route("DELETE", path)


def _split_path(path: str) -> list[str]:
    stripped = path.strip("/")
    if not stripped:
        return []
    return stripped.split("/")


def _match_route_path(route_path: str, path: str) -> dict[str, str] | None:
    route_parts = _split_path(route_path)
    path_parts = _split_path(path)

    if len(route_parts) != len(path_parts):
        return None

    params: dict[str, str] = {}
    for route_part, path_part in zip(route_parts, path_parts):
        if route_part.startswith("<") and route_part.endswith(">"):
            param_name = route_part[1:-1].strip()
            if not param_name:
                return None
            params[param_name] = path_part
            continue
        if route_part != path_part:
            return None
    return params


def match_route(method: str, path: str) -> tuple[Handler | None, dict[str, str]]:
    handler = routes.get((method.upper(), path))
    if handler:
        return handler, {}

    for (route_method, route_path), route_handler in routes.items():
        if route_method != method.upper():
            continue
        params = _match_route_path(route_path, path)
        if params is not None:
            return route_handler, params

    return None, {}
