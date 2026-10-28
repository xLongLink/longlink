from typing import Literal, TypedDict
from fastapi import Response
from src.environments import env

AUTH_COOKIE = "longlink_auth"
OAUTH_STATE_COOKIE = "longlink_oauth"
PASSWORD_RESET_COOKIE = "longlink_password_reset"
REGISTRATION_COOKIE = "longlink_registration"

_COOKIE_PATHS = {
    AUTH_COOKIE: "/",
    OAUTH_STATE_COOKIE: "/api/v1/auth/oauth",
    PASSWORD_RESET_COOKIE: "/api/v1/auth/reset-password",
    REGISTRATION_COOKIE: "/api/v1/auth/register",
}


# Share the same policy between cookie creation and deletion.
class CookiePolicy(TypedDict):
    """Shared browser-credential security parameters for setting and deleting one cookie."""

    path: str
    secure: bool
    httponly: bool
    samesite: Literal["lax"]


def _policy(name: str) -> CookiePolicy:
    """Return the security parameters shared by cookie creation and deletion."""

    # Deletion must mirror creation or browsers retain the credential.
    return {"path": _COOKIE_PATHS[name], "secure": env.PUBLIC_URL.startswith("https://"), "httponly": True, "samesite": "lax"}


def set_browser_cookie(response: Response, name: str, value: str, max_age: int) -> None:
    """Set a non-cacheable secure browser-only cookie with consistent security parameters."""

    # Prevent intermediaries from retaining responses that create browser credentials.
    response.headers["Cache-Control"] = "no-store"
    response.set_cookie(name, value, max_age=max_age, **_policy(name))


def delete_browser_cookie(response: Response, name: str) -> None:
    """Delete a browser cookie matching the secure parameters used when setting it."""

    response.delete_cookie(name, **_policy(name))
