from typing import Callable, Awaitable, Any


routes: dict[str, Callable[..., Awaitable[Any]]] = {}


def get(path: str):
    def decorator(func: Callable[..., Awaitable[Any]]) -> Callable[..., Awaitable[Any]]:
        routes[path] = func
        return func
    return decorator