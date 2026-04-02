import inspect
from typing import Any, Callable, Awaitable
from fastapi import APIRouter
from pydantic import BaseModel
from functools import wraps
from fastapi.responses import Response, JSONResponse, PlainTextResponse

Handler = Callable[..., Awaitable[Any]]

api_router = APIRouter()
_pages: list[dict[str, str]] = []



def _build_endpoint(handler: Handler, *, is_page: bool = False) -> Handler:
    @wraps(handler)
    async def endpoint(*args, **kwargs):
        body = await handler(*args, **kwargs)

        if is_page:
            from longlink.ui import Page

            if not isinstance(body, Page):
                return PlainTextResponse(
                    "Invalid response type. Page routes must return longlink.ui.Page.",
                    status_code=500,
                )
            return JSONResponse(list(body))

        return _format_response(handler, body)

    endpoint.__signature__ = inspect.signature(handler)
    return endpoint


def _format_response(handler: Handler, body: Any) -> Response | JSONResponse | PlainTextResponse:
    return_type = inspect.signature(handler).return_annotation

    if (
        return_type is not inspect.Signature.empty
        and isinstance(return_type, type)
        and issubclass(return_type, BaseModel)
    ):
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

    if isinstance(body, (dict, list)):
        return JSONResponse(body)

    if isinstance(body, bytes):
        return Response(content=body, media_type="text/plain")

    return PlainTextResponse(str(body))


def route(path: str, methods: list[str] | None = None):
    normalized_methods = [method.upper() for method in (methods or ["GET"])]

    def decorator(func: Handler) -> Handler:
        api_router.add_api_route(
            path,
            _build_endpoint(func),
            methods=normalized_methods,
            response_model=None,
        )
        return func

    return decorator


def page(path: str, name: str, icon: str):
    def decorator(func: Handler) -> Handler:
        _pages.append({"path": path, "name": name, "icon": icon})
        api_router.add_api_route(
            path,
            _build_endpoint(func, is_page=True),
            methods=["GET"],
            response_model=None,
        )
        return func

    return decorator


def pages() -> list[dict[str, str]]:
    return list(_pages)


def get(path: str):
    return route(path, ["GET"])


def post(path: str):
    return route(path, ["POST"])


def put(path: str):
    return route(path, ["PUT"])


def patch(path: str):
    return route(path, ["PATCH"])


def delete(path: str):
    return route(path, ["DELETE"])
