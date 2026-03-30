import json
import inspect
from typing import Any, get_type_hints
from pydantic import BaseModel
from longlink.cron import Cron
from longlink.router import Router
from starlette.routing import Route
from starlette.requests import Request
from starlette.responses import Response, JSONResponse, PlainTextResponse
from starlette.applications import Starlette


class LongLink(Router, Cron):
    def __init__(self) -> None:
        super().__init__()
        self._starlette = Starlette(
            routes=[Route("/{full_path:path}", self._dispatch, methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])]
        )

    async def __call__(self, scope, receive, send):
        await self._starlette(scope, receive, send)

    async def _dispatch(self, request: Request) -> Response:
        method = request.method
        path = request.url.path
        query_string = request.url.query

        handler, params = self.match(method, path, query_string=query_string)

        if not handler:
            return PlainTextResponse("Not Found", status_code=404)

        body_payload = await self._read_json_body(request)
        call_params = self._merge_body_params(handler, params, body_payload)

        if call_params:
            body = await handler(**call_params)
        else:
            body = await handler()

        is_page_handler = any(route.handler is handler for route in self._pages)

        return_type = get_type_hints(handler).get('return')
        if is_page_handler:
            from longlink.ui import Page

            if return_type is not Page or not isinstance(body, Page):
                return PlainTextResponse(
                    "Invalid response type. Page routes must return longlink.ui.Page.",
                    status_code=500,
                )

            return JSONResponse(list(body))
        elif return_type and isinstance(return_type, type) and issubclass(return_type, BaseModel):
            if not isinstance(body, return_type):
                return PlainTextResponse(
                    f"Invalid response type. Expected {return_type.__name__}.",
                    status_code=500,
                )

            if hasattr(body, 'model_dump_json'):
                response_body = body.model_dump_json()
            else:
                response_body = body.json()
            return Response(content=response_body, media_type="application/json")
        else:
            if isinstance(body, dict):
                return JSONResponse(body)

            if isinstance(body, bytes):
                return Response(content=body, media_type="text/plain")

            return PlainTextResponse(str(body))

    async def _read_json_body(self, request: Request) -> dict[str, Any] | None:
        method = request.method.upper()
        if method in {'GET', 'HEAD', 'OPTIONS'}:
            return None

        body = await request.body()
        if body == b'':
            return None

        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            return None

        if not isinstance(payload, dict):
            return None

        return payload

    def _merge_body_params(self, handler, params: dict[str, Any], payload: dict[str, Any] | None) -> dict[str, Any]:
        if payload is None:
            return params

        merged_params = dict(params)
        signature = inspect.signature(handler)
        annotations = get_type_hints(handler)

        missing_parameters = [
            name for name in signature.parameters
            if name not in merged_params
        ]

        if len(missing_parameters) == 1:
            candidate = missing_parameters[0]
            annotation = annotations.get(candidate)
            if isinstance(annotation, type) and issubclass(annotation, BaseModel):
                merged_params[candidate] = annotation.model_validate(payload)
                return merged_params

        for key, value in payload.items():
            if key in signature.parameters and key not in merged_params:
                merged_params[key] = value

        return merged_params
