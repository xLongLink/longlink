from typing import Literal, TypedDict
from fastapi import Response
from src.environments import env


class CookiePolicy(TypedDict):
    """Shared browser-credential security parameters for setting and deleting one cookie."""

    path: str
    secure: bool
    httponly: bool
    samesite: Literal["lax"]


def _policy(path: str) -> CookiePolicy:
    """Return the security parameters shared by cookie creation and deletion."""

    # Deletion must mirror creation or browsers retain the credential.
    return {
        "path": path,
        "secure": env.PUBLIC_URL.startswith("https://"),
        "httponly": True,
        "samesite": "lax",
    }


def set_browser_cookie(response: Response, name: str, value: str, path: str, max_age: int) -> None:
    """Set a non-cacheable secure browser-only cookie with consistent security parameters."""

    # Prevent intermediaries from retaining responses that create browser credentials.
    response.headers["Cache-Control"] = "no-store"
    response.set_cookie(name, value, max_age=max_age, **_policy(path))


def delete_browser_cookie(response: Response, name: str, path: str) -> None:
    """Delete a browser cookie matching the secure parameters used when setting it."""

    response.delete_cookie(name, **_policy(path))
