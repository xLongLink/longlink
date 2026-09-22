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

    # Act
    response = TestClient(app).delete("/resource")

    # Assert
    assert response.status_code == 204
    assert response.content == b""
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
    assert "secret-value" not in response.text


def test_installed_unexpected_handler_hides_exception_details_and_disables_caching() -> None:
    """Return a safe non-cacheable response when application code fails."""

    # Arrange
    app = FastAPI()

    @app.get("/orders")
    async def get_orders() -> None:
        """Simulate an unexpected application failure."""

        raise RuntimeError("database password: secret-value")

    install_error_handlers(app)

    # Act
    response = TestClient(app, raise_server_exceptions=False).get("/orders")

    # Assert
    assert response.status_code == 500
    assert response.json() == {"detail": "An unexpected error occurred. Please try again later."}
    assert response.headers["cache-control"] == "no-store"
    assert "secret-value" not in response.text


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

    # Act
    response = TestClient(app).get("/orders")

    # Assert
    assert response.status_code == 418
    assert response.json() == {"solution": "Custom response"}
