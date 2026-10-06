import pytest
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from starlette import exceptions
from longlink.errors import install_error_handlers
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient


def test_installed_http_handler_preserves_bodyless_status_and_headers() -> None:
    """Return a bodyless HTTP response without discarding its headers."""

    # Arrange
    app = FastAPI()

    @app.delete("/resource")
    async def delete_resource() -> None:
        """Return a response with a body-prohibited status."""

        raise HTTPException(status_code=204, headers={"x-operation-id": "operation-123"})

    install_error_handlers(app)

    # Act
    response = TestClient(app).delete("/resource")

    # Assert
    assert response.status_code == 204
    assert response.content == b""
    assert response.headers["x-operation-id"] == "operation-123"


def test_installed_http_handler_falls_back_for_blank_detail_and_preserves_headers() -> None:
    """Replace a blank HTTP error detail without discarding its status or headers."""

    # Arrange
    app = FastAPI()

    @app.get("/resource")
    async def get_resource() -> None:
        """Return an HTTP error without a useful detail."""

        raise HTTPException(status_code=403, detail="   ", headers={"x-operation-id": "operation-123"})

    install_error_handlers(app)

    # Act
    response = TestClient(app).get("/resource")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "The request could not be completed."}
    assert response.headers["x-operation-id"] == "operation-123"


def test_installed_validation_handler_hides_submitted_values() -> None:
    """Return the stable public validation message without echoed input."""

    # Arrange
    app = FastAPI()

    class Payload(BaseModel):
        """Require a numeric value from the request body."""

        quantity: int

    @app.post("/orders")
    async def create_order(payload: Payload) -> Payload:
        """Return validated request data."""

        return payload

    install_error_handlers(app)

    # Act
    response = TestClient(app).post("/orders", json={"quantity": "secret-value"})

    # Assert
    assert response.status_code == 422
    assert response.json() == {"detail": "Invalid request. Please check your input and try again."}


def test_installed_handlers_preserve_a_solution_owned_validation_handler() -> None:
    """Preserve the Solution's validation error envelope instead of installing the SDK default."""

    # Arrange
    app = FastAPI()

    class Payload(BaseModel):
        """Require an integer so an invalid request reaches the real validation boundary."""

        quantity: int

    @app.exception_handler(RequestValidationError)
    async def solution_validation_handler(_request: object, _error: RequestValidationError) -> JSONResponse:
        """Return the Solution-owned validation response."""

        # Retain the explicitly registered public response without reflecting submitted values.
        return JSONResponse(status_code=422, content={"solution": "Quantity must be an integer"})

    @app.post("/orders")
    async def create_order(payload: Payload) -> Payload:
        """Expose the request schema through actual HTTP validation."""

        # Only valid requests can reach this endpoint.
        return payload

    install_error_handlers(app)
    client = TestClient(
        app,
    )

    # Act
    response = client.post("/orders", json={"quantity": "secret-value"})

    # Assert
    assert response.status_code == 422
    assert response.json() == {"solution": "Quantity must be an integer"}


@pytest.mark.parametrize("exception_type", [HTTPException, exceptions.HTTPException], ids=["fastapi", "starlette"])
def test_installed_handlers_preserve_a_solution_owned_http_handler(exception_type: type[exceptions.HTTPException]) -> None:
    """Leave a Solution's explicit HTTP error response contract unchanged."""

    # Arrange
    app = FastAPI()

    @app.exception_handler(exception_type)
    async def solution_http_handler(_request: object, error: exceptions.HTTPException) -> JSONResponse:
        """Return the Solution-owned error envelope."""

        return JSONResponse(status_code=error.status_code, content={"solution": error.detail})

    @app.get("/orders")
    async def get_orders() -> None:
        """Return a Solution-owned HTTP error."""

        raise HTTPException(status_code=418, detail="Custom response")

    install_error_handlers(app)

    # Act
    response = TestClient(app).get("/orders")

    # Assert
    assert response.status_code == 418
    assert response.json() == {"solution": "Custom response"}


@pytest.mark.parametrize("handler_key", [Exception, 500], ids=["exception", "status"])
def test_installed_handlers_preserve_a_solution_owned_server_error_handler(handler_key: type[Exception] | int) -> None:
    """Preserve Solution-owned unexpected-error contracts registered by exception or status."""

    # Arrange
    app = FastAPI()

    @app.exception_handler(handler_key)
    async def solution_server_handler(_request: object, _error: Exception) -> JSONResponse:
        """Return the Solution-owned server-error envelope."""

        # Preserve the explicitly registered public error response.
        return JSONResponse(status_code=503, content={"solution": "Try again later"})

    @app.get("/orders")
    async def get_orders() -> None:
        """Raise an unexpected endpoint failure handled by the Solution."""

        # Exercise real exception dispatch rather than calling a handler directly.
        raise RuntimeError("private failure detail")

    install_error_handlers(app)
    client = TestClient(
        app,
        raise_server_exceptions=False,
    )

    # Act
    response = client.get("/orders")

    # Assert
    assert response.status_code == 503
    assert response.json() == {"solution": "Try again later"}
