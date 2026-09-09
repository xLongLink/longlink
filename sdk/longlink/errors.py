import logging
import traceback
from copy import deepcopy
from fastapi import FastAPI, Request, exception_handlers
from fastapi.utils import is_body_allowed_for_status_code
from fastapi.routing import APIRoute, iter_route_contexts
from fastapi.responses import Response, JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException

logger = logging.getLogger(__name__)


async def http_error_response(_request: Request, error: HTTPException) -> Response:
    """Keep HTTP status and headers while returning a readable error detail."""

    # Preserve responses whose status prohibits a body.
    if not is_body_allowed_for_status_code(error.status_code):
        return Response(status_code=error.status_code, headers=error.headers)

    detail = error.detail if isinstance(error.detail, str) and error.detail.strip() else "The request could not be completed."
    return JSONResponse(status_code=error.status_code, content={"detail": detail}, headers=error.headers)


async def validation_error_response(_request: Request, _error: RequestValidationError) -> JSONResponse:
    """Reject invalid input without exposing submitted values or validator diagnostics."""

    return JSONResponse(status_code=422, content={"detail": "Invalid request. Please check your input and try again."})


async def unexpected_error_response(_request: Request, error: Exception) -> JSONResponse:
    """Log unexpected failures server-side and return a safe public message."""

    # Record stack locations without exception values, SQL parameters, or submitted inputs.
    stack = "\n".join(
        f"  {frame.f_code.co_filename}:{lineno} in {frame.f_code.co_name}"
        for frame, lineno in traceback.walk_tb(error.__traceback__)
    )
    logger.error("Unhandled Solution error\n%s", stack)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again later."},
        headers={"cache-control": "no-store"},
    )


def install_error_handlers(app: FastAPI) -> None:
    """Replace framework defaults without overriding Solution-owned error handlers."""

    # FastAPI preinstalls HTTP and validation handlers even when none were supplied.
    if app.exception_handlers.get(HTTPException) in (None, exception_handlers.http_exception_handler):
        app.exception_handler(HTTPException)(http_error_response)
    if app.exception_handlers.get(RequestValidationError) in (None, exception_handlers.request_validation_exception_handler):
        app.exception_handler(RequestValidationError)(validation_error_response)
    if Exception not in app.exception_handlers and 500 not in app.exception_handlers:
        app.add_exception_handler(Exception, unexpected_error_response)

    original_openapi = app.openapi

    def openapi() -> dict[str, object]:
        """Describe SDK validation defaults without changing Solution-owned responses."""

        # Check at generation time so later handlers and route registrations retain ownership.
        schema = original_openapi()
        if app.exception_handlers.get(RequestValidationError) is not validation_error_response:
            return schema

        # Keep FastAPI's cached document intact if the Solution later replaces its handler.
        schema = deepcopy(schema)
        for route in iter_route_contexts(app.routes):
            if not isinstance(route.original_route, APIRoute) or not route.include_in_schema:
                continue
            if any(str(status).upper() in {"422", "4XX", "DEFAULT"} for status in route.responses):
                continue
            if route.openapi_extra and "422" in route.openapi_extra.get("responses", {}):
                continue

            # Replace only FastAPI's automatic response, leaving shared component schemas alone.
            path_item = schema.get("paths", {}).get(route.path_format, {})
            for method in route.methods or ():
                response = path_item.get(method.lower(), {}).get("responses", {}).get("422")
                if response == {
                    "description": "Validation Error",
                    "content": {"application/json": {"schema": {"$ref": "#/components/schemas/HTTPValidationError"}}},
                }:
                    response["content"]["application/json"]["schema"] = {
                        "type": "object",
                        "properties": {"detail": {"type": "string"}},
                        "required": ["detail"],
                    }
        return schema

    # FastAPI documents replacing this bound method as its OpenAPI customization hook.
    app.openapi = openapi  # ty: ignore[invalid-assignment]
