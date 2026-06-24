from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class ApiError(Exception):
    """Base class for API errors mapped to HTTP responses."""

    status_code = 500

    def __init__(self, detail: str) -> None:
        """Store the response detail for the error handler."""

        super().__init__(detail)
        self.detail = detail


class NotFoundError(ApiError):
    """Return a standard not-found response."""

    status_code = 404

    def __init__(self, resource: str, identifier: object) -> None:
        """Build a standard not-found message."""

        super().__init__(f"{resource} '{identifier}' not found")


class ConflictError(ApiError):
    """Return a standard conflict response."""

    status_code = 409


class ForbiddenError(ApiError):
    """Return a standard forbidden response."""

    status_code = 403


class UnauthorizedError(ApiError):
    """Return a standard unauthorized response."""

    status_code = 401


class UnavailableError(ApiError):
    """Return a standard service-unavailable response."""

    status_code = 503


def register_error_handlers(app: FastAPI) -> None:
    """Register the shared API error handler on the FastAPI app."""

    @app.exception_handler(ApiError)
    async def handle_api_error(request: Request, exc: ApiError) -> JSONResponse:
        """Convert domain errors into JSON API responses."""

        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
