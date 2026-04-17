import json
import inspect
from typing import Any, Callable
from fastapi import APIRouter
from pathlib import Path
from pydantic import BaseModel
from functools import wraps
from fastapi.responses import Response, JSONResponse, PlainTextResponse

Handler = Callable[..., Any]


def _build_endpoint(handler: Handler, *, is_page: bool = False) -> Handler:
    @wraps(handler)
    async def endpoint(*args, **kwargs):
        result = handler(*args, **kwargs)
        body = await result if inspect.isawaitable(result) else result

        if is_page:
            if isinstance(body, str):
                return Response(
                    content=body,
                    media_type="text/xml",
                )
            if isinstance(body, (dict, list)):
                return Response(
                    content=json.dumps(body),
                    media_type="application/json",
                )
            return PlainTextResponse(
                "Invalid response type. Page routes must return an XML string, dict, or list.",
                status_code=500,
            )

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


class Router(APIRouter):
    """APIRouter that applies LongLink response formatting to route handlers."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        """Create router and initialize in-memory page metadata store."""
        super().__init__(*args, **kwargs)

    def add_api_route(self, path: str, endpoint: Callable[..., Any], **kwargs: Any) -> None:
        """Register route after wrapping endpoint with LongLink response handling."""

        super().add_api_route(path, _build_endpoint(endpoint), **kwargs)

    def page(self, path: str, name: str, icon: str) -> Callable[[Handler], Handler]:
        """Register page endpoint and track metadata for page listing."""

        def decorator(func: Handler) -> Handler:
            self._pages.append({"path": path, "name": name, "icon": icon})
            endpoint_path = f"/pages/{path.lstrip('/')}"
            super().add_api_route(
                endpoint_path,
                _build_endpoint(func, is_page=True),
                methods=["GET"],
                response_model=None,
            )
            return func

        return decorator
