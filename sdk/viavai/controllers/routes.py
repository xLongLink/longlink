from typing import Callable, Awaitable, Any
from urllib.parse import parse_qs

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


def _is_param_segment(segment: str) -> bool:
    return (segment.startswith("<") and segment.endswith(">")) or (
        segment.startswith("{") and segment.endswith("}")
    )


def _param_name(segment: str) -> str:
    if segment.startswith("<") and segment.endswith(">"):
        return segment[1:-1].strip()
    if segment.startswith("{") and segment.endswith("}"):
        return segment[1:-1].strip()
    return ""


def _split_route_template(route_path: str) -> tuple[str, list[str]]:
    if "?" not in route_path:
        return route_path, []
    path_part, query_part = route_path.split("?", 1)
    query_names: list[str] = []
    for token in query_part.split("&"):
        token = token.strip()
        if not token:
            continue
        if token.startswith("{") and token.endswith("}"):
            name = token[1:-1].strip()
            if name:
                query_names.append(name)
            continue
        if "=" in token:
            key, value = token.split("=", 1)
            key = key.strip()
            value = value.strip()
            if value.startswith("{") and value.endswith("}"):
                name = value[1:-1].strip()
                if key:
                    query_names.append(key)
                elif name:
                    query_names.append(name)
                continue
        if token:
            query_names.append(token)
    return path_part, query_names


def _match_route_path(route_path: str, path: str) -> dict[str, str] | None:
    route_parts = _split_path(route_path)
    path_parts = _split_path(path)

    if len(route_parts) != len(path_parts):
        return None

    params: dict[str, str] = {}
    for route_part, path_part in zip(route_parts, path_parts):
        if _is_param_segment(route_part):
            param_name = _param_name(route_part)
            if not param_name:
                return None
            params[param_name] = path_part
            continue
        if route_part != path_part:
            return None
    return params


def _extract_query_params(query_string: str, expected_params: list[str]) -> dict[str, str]:
    if not query_string or not expected_params:
        return {}
    parsed = parse_qs(query_string, keep_blank_values=True)
    params: dict[str, str] = {}
    for name in expected_params:
        if name in parsed and parsed[name]:
            params[name] = parsed[name][0]
    return params


def match_route(method: str, path: str, query_string: str = "") -> tuple[Handler | None, dict[str, str]]:
    handler = routes.get((method.upper(), path))
    if handler:
        return handler, {}

    for (route_method, route_path), route_handler in routes.items():
        if route_method != method.upper():
            continue
        route_path_part, query_params = _split_route_template(route_path)
        params = _match_route_path(route_path_part, path)
        if params is not None:
            query_values = _extract_query_params(query_string, query_params)
            params.update(query_values)
            return route_handler, params

    return None, {}



# Query string parameters
# Automatically encoded as application/x-www-form-urlencoded
# 
# Filtering
# Searching
# Pagination
# Sorting

