import inspect
from functools import wraps
from typing import Any, Callable, Awaitable, get_type_hints

from fastapi import FastAPI
from fastapi.responses import JSONResponse, PlainTextResponse, Response
from pydantic import BaseModel

import longlink.router as router

Handler = Callable[..., Awaitable[Any]]


def create_app() -> FastAPI:
    app = FastAPI()

    for registered_route in router._routes:
        path = registered_route.template.split("?", 1)[0]
        app.add_api_route(
            path,
            create_route_endpoint(registered_route.handler),
            methods=[registered_route.method],
        )

    return app


def create_route_endpoint(handler: Handler) -> Handler:
    @wraps(handler)
    async def endpoint(*args, **kwargs):
        body = await handler(*args, **kwargs)
        return format_handler_response(handler, body)

    endpoint.__signature__ = inspect.signature(handler)
    return endpoint


def format_handler_response(handler: Handler, body: Any) -> Response | JSONResponse | PlainTextResponse:
    is_page_handler = router.is_page_handler(handler)
    return_type = get_type_hints(handler).get("return")

    if is_page_handler:
        from longlink.ui import Page

        if return_type is not Page or not isinstance(body, Page):
            return PlainTextResponse(
                "Invalid response type. Page routes must return longlink.ui.Page.",
                status_code=500,
            )

        return JSONResponse(list(body))

    if return_type and isinstance(return_type, type) and issubclass(return_type, BaseModel):
        if not isinstance(body, return_type):
            return PlainTextResponse(
                f"Invalid response type. Expected {return_type.__name__}.",
                status_code=500,
            )

        if hasattr(body, "model_dump_json"):
            response_body = body.model_dump_json()
        else:
            response_body = body.json()

        return Response(content=response_body, media_type="application/json")

    if isinstance(body, dict):
        return JSONResponse(body)

    if isinstance(body, bytes):
        return Response(content=body, media_type="text/plain")

    return PlainTextResponse(str(body))
