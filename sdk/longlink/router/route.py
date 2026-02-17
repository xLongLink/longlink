import re
from typing import Callable, Awaitable, Any
from urllib.parse import parse_qs


Handler = Callable[..., Awaitable[Any]]


class Route:
    def __init__(self, method: str, template: str, handler: Handler):
        self.method = method
        self.template = template
        self.handler = handler

        self.path_regex, self.path_params = self._compile_path(template)
        self.query_params = self._compile_query(template)

    def _compile_path(self, template: str):
        path = template.split("?", 1)[0]
        params = []

        def repl(match):
            name = match.group(1)
            params.append(name)
            return r"([^/]+)"

        regex = re.sub(r"\{(\w+)\}", repl, path)
        return re.compile(f"^{regex}$"), params

    def _compile_query(self, template: str):
        if "?" not in template:
            return {}

        query = template.split("?", 1)[1]
        params = {}

        for part in query.split("&"):
            if "=" in part:
                key, value = part.split("=", 1)
                if value.startswith("{") and value.endswith("}"):
                    params[key] = value[1:-1]
            else:
                if part.startswith("{") and part.endswith("}"):
                    params[part[1:-1]] = part[1:-1]

        return params

    def match(self, path: str):
        if "?" in path:
            raw_path, raw_query = path.split("?", 1)
            query = parse_qs(raw_query)
        else:
            raw_path, query = path, {}

        m = self.path_regex.match(raw_path)
        if not m:
            return None

        values = dict(zip(self.path_params, m.groups()))

        for query_key, param_name in self.query_params.items():
            if query_key in query:
                values[param_name] = query[query_key][0]

        return values
