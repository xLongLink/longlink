from typing import get_type_hints
from pydantic import BaseModel
from viavai.cron import Cron
from viavai.logs import Logs
from viavai.router import Router


class ViaVai(Router, Cron, Logs):
    def __init__(self, title: str = "Sample", description: str = "Sample description", version: str = "0.0.0"):
        self.title = title
        self.description = description
        self.version = version
        super().__init__()

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return

        method = scope["method"]
        path = scope["path"]

        query_string = scope.get("query_string", b"")
        if isinstance(query_string, bytes):
            query_string = query_string.decode()

        handler, params = match_route(method, path, query_string=query_string)

        if not handler:
            await send({
                "type": "http.response.start",
                "status": 404,
                "headers": [],
            })
            await send({
                "type": "http.response.body",
                "body": b"Not Found",
            })
            return

        if params:
            body = await handler(**params)
        else:
            body = await handler()

        return_type = get_type_hints(handler).get("return")
        if return_type and isinstance(return_type, type) and issubclass(return_type, BaseModel):
            if not isinstance(body, return_type):
                await send({
                    "type": "http.response.start",
                    "status": 500,
                    "headers": [(b"content-type", b"text/plain")],
                })
                await send({
                    "type": "http.response.body",
                    "body": f"Invalid response type. Expected {return_type.__name__}.".encode(),
                })
                return

            if hasattr(body, "model_dump_json"):
                response_body = body.model_dump_json()
            else:
                response_body = body.json()
            headers = [(b"content-type", b"application/json")]
            body_bytes = response_body.encode()
        else:
            headers = [(b"content-type", b"text/plain")]
            if isinstance(body, bytes):
                body_bytes = body
            else:
                body_bytes = str(body).encode()

        await send({
            "type": "http.response.start",
            "status": 200,
            "headers": headers,
        })
        await send({
            "type": "http.response.body",
            "body": body_bytes,
        })

    
