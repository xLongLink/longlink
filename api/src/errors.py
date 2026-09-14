import logging
import traceback
from fastapi import Request
from pydantic import BaseModel
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class ErrorResponse(BaseModel):
    """Describe the public error contract without internal diagnostics."""

    detail: str


async def unexpected_error_response(_request: Request, error: Exception) -> JSONResponse:
    """Log unexpected failures server-side and return a safe public message."""

    # Record stack locations without exception values, SQL parameters, or submitted inputs.
    stack = "\n".join(
        f"  {frame.f_code.co_filename}:{lineno} in {frame.f_code.co_name}" for frame, lineno in traceback.walk_tb(error.__traceback__)
    )
    logger.error("Unhandled API error\n%s", stack)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again later."},
        headers={"cache-control": "no-store"},
    )


async def service_error_response(_request: Request, error: "ServiceError") -> JSONResponse:
    """Return expected service failures as readable API responses."""

    return JSONResponse(status_code=error.status_code, content={"detail": str(error)})


class ServiceError(Exception):
    """Base class for expected database service failures."""

    status_code = 500


class InvalidError(ServiceError):
    """Raise when submitted configuration does not satisfy release requirements."""

    status_code = 422


class NotFoundError(ServiceError):
    """Raise when a required persisted resource is absent."""

    status_code = 404


class ConflictError(ServiceError):
    """Raise when a requested mutation conflicts with persisted state."""

    status_code = 409


class ForbiddenError(ServiceError):
    """Raise when a requested mutation is not permitted by domain rules."""

    status_code = 403


class UnavailableError(ServiceError):
    """Raise when required Platform infrastructure is unavailable."""

    status_code = 503
