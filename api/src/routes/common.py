from fastapi import HTTPException


def not_found(resource: str, identifier: object) -> HTTPException:
    """Build a standard 404 for a missing resource."""

    return HTTPException(status_code=404, detail=f"{resource} '{identifier}' not found")


def conflict(exc: ValueError) -> HTTPException:
    """Build a standard 409 from a uniqueness violation."""

    return HTTPException(status_code=409, detail=str(exc))
