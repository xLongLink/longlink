from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from longlink.errors import install_error_handlers
from fastapi.responses import JSONResponse
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
    client = TestClient(
        app,
    )

    # Act
    with client:
        response = client.delete("/resource")

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
    client = TestClient(
        app,
    )

    # Act
    with client:
        response = client.get("/resource")

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
    client = TestClient(
        app,
    )

    # Act
    with client:
        response = client.post("/orders", json={"quantity": "secret-value"})

    # Assert
    assert response.status_code == 422
    assert response.json() == {"detail": "Invalid request. Please check your input and try again."}


def test_installed_handlers_preserve_a_solution_owned_http_handler() -> None:
    """Leave a Solution's explicit HTTP error response contract unchanged."""

    # Arrange
    app = FastAPI()

    @app.exception_handler(HTTPException)
    async def solution_http_handler(_request: object, error: HTTPException) -> JSONResponse:
        """Return the Solution-owned error envelope."""

        return JSONResponse(status_code=error.status_code, content={"solution": error.detail})

    @app.get("/orders")
    async def get_orders() -> None:
        """Return a Solution-owned HTTP error."""

        raise HTTPException(status_code=418, detail="Custom response")

    install_error_handlers(app)
    client = TestClient(
        app,
    )

    # Act
    with client:
        response = client.get("/orders")

    # Assert
    assert response.status_code == 418
    assert response.json() == {"solution": "Custom response"}
