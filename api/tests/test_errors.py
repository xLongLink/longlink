import json
import pytest
from fastapi import FastAPI
from src.errors import ApiError, ConflictError, register_error_handlers
from starlette.requests import Request

pytestmark = pytest.mark.no_db


async def test_api_errors_return_json_detail() -> None:
    """Map domain errors to JSON detail responses."""

    app = FastAPI()
    register_error_handlers(app)
    request = Request({"type": "http", "method": "GET", "path": "/conflict", "headers": []})
    handler = app.exception_handlers[ApiError]
    response = await handler(request, ConflictError("Application already exists"))

    assert response.status_code == 409
    assert json.loads(response.body) == {"detail": "Application already exists"}
