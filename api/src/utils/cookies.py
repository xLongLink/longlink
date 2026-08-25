from fastapi import Response
from src.environments import env


def set_browser_cookie(response: Response, name: str, value: str, path: str, max_age: int) -> None:
    """Set a secure browser-only cookie with consistent security parameters."""

    response.set_cookie(
        name,
        value,
        max_age=max_age,
        path=path,
        secure=not env.DEVELOPMENT,
        httponly=True,
        samesite="lax",
    )


def delete_browser_cookie(response: Response, name: str, path: str) -> None:
    """Delete a browser cookie matching the secure parameters used when setting it."""

    response.delete_cookie(
        name,
        path=path,
        secure=not env.DEVELOPMENT,
        httponly=True,
        samesite="lax",
    )
