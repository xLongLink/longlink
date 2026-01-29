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
