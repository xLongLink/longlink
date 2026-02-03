import inspect
from typing import Callable, Awaitable, Any
from .route import Route


Handler = Callable[..., Awaitable[Any]]


class Router:
    def __init__(self) -> None:
        self._routes: list[Route] = []

    def _route(self, method: str, path: str):
        def decorator(func: Handler) -> Handler:
            self._routes.append(Route(method.upper(), path, func))
            return func
        return decorator

    def _match(self, method: str, path: str) -> Handler | None:
        for route in self._routes:
            if route.method != method.upper():
                continue

            params = route.match(path)
            if params is None:
                continue

            sig = inspect.signature(route.handler)
            bound = sig.bind_partial(**params)
            bound.apply_defaults()

            async def wrapper(*_):
                return await route.handler(**bound.arguments)

            wrapper.__name__ = route.handler.__name__
            return wrapper

        return None

    def get(self, path: str): return self._route("GET", path)
    def post(self, path: str): return self._route("POST", path)
    def put(self, path: str): return self._route("PUT", path)
    def patch(self, path: str): return self._route("PATCH", path)
    def delete(self, path: str): return self._route("DELETE", path)



if __name__ == "__main__":
    router = Router()

    @router.get("/users/{user_id}/posts?{filter}&sort={sort_order}")
    async def get_user_posts(user_id: str, filter: str = "", sort: str = "asc"):
        return {"user_id": user_id, "filter": filter, "sort": sort}

    fn = router._match("GET", "/users/admin/posts?filter=any&sort=desc")
    assert fn is not None, "Handler not found for registered route"
    assert fn.__name__ == "get_user_posts", "Handler function name does not match expected"

