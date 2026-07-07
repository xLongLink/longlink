import httpx2
import urllib.parse
from typing import Any, Final, Literal
from fastapi import Query, Request, Response, APIRouter
from pydantic import ValidationError
from src.auth import SessionAccountsService, oauth
from src.errors import UnauthorizedError, UnavailableError
from src.operations import provisioning
from src.models.auth import OidcUserInfo
from src.environments import env
from fastapi.responses import RedirectResponse
from src.models.common import SuccessResponse
from src.database.services import users
from authlib.integrations.base_client import OAuthError

router = APIRouter()
DEFAULT_POST_LOGIN_REDIRECT: Final[str] = "/organizations"
OIDC_NEXT_SESSION_KEY: Final[str] = "oidc_next"


def sanitize_post_login_redirect(next_path: object) -> str:
    """Return a safe same-origin post-login redirect path."""

    if not isinstance(next_path, str):
        return DEFAULT_POST_LOGIN_REDIRECT

    if not next_path.startswith("/") or next_path.startswith("//") or "\\" in next_path:
        return DEFAULT_POST_LOGIN_REDIRECT

    if any(ord(character) < 32 or ord(character) == 127 for character in next_path):
        return DEFAULT_POST_LOGIN_REDIRECT

    # Use URL parsing so protocol-relative paths cannot be confused with local paths.
    parsed_path = urllib.parse.urlsplit(next_path)
    if parsed_path.scheme or parsed_path.netloc:
        return DEFAULT_POST_LOGIN_REDIRECT

    return next_path


async def upsert_oidc_user(userinfo: OidcUserInfo) -> str:
    """Normalize provider profile claims into the local user record."""

    email = userinfo.email
    if not email:
        raise UnavailableError("Authentication provider returned no email")

    name = userinfo.name or userinfo.preferred_username
    if not name:
        given_name = userinfo.given_name
        family_name = userinfo.family_name
        if not given_name or not family_name:
            raise UnavailableError("Authentication provider returned no display name")

        name = f"{given_name} {family_name}"

    if userinfo.email_verified is not True:
        raise UnauthorizedError("Authentication provider returned an unverified email")

    user = await users.upsert(
        oidc=userinfo.sub,
        email=str(email),
        name=name,
        avatar=userinfo.picture,
    )
    if user.deleted_at is not None:
        raise UnauthorizedError("Not authenticated")

    try:
        await provisioning.sync_user_organizations(user)
    except Exception as exc:
        raise UnavailableError("Failed to synchronize user profile") from exc

    return userinfo.sub


@router.get("/auth/login/oidc", include_in_schema=False)
async def login_oidc(
    request: Request,
    provider: Literal["github", "google"] | None = None,
    next_path: str | None = Query(default=None, alias="next"),
) -> Response:
    """Initiate OIDC login flow by redirecting to the identity provider."""

    oauth_client: Any = oauth
    oidc = oauth_client.create_client("oidc")

    request.session[OIDC_NEXT_SESSION_KEY] = sanitize_post_login_redirect(next_path)
    authorize_kwargs: dict[str, Any] = {}

    if provider is not None:
        authorize_kwargs["kc_idp_hint"] = provider

    try:
        response = await oidc.authorize_redirect(
            request,
            redirect_uri=env.OIDC_REDIRECT_URI,
            **authorize_kwargs,
        )
        if not isinstance(response, Response):
            raise UnavailableError("OIDC provider returned an invalid redirect response")

        return response
    except httpx2.HTTPStatusError as exc:
        raise UnavailableError(
            "OIDC provider metadata is unavailable. Check OIDC_ISSUER and provider realm configuration."
        ) from exc


@router.get("/auth/oidc", include_in_schema=False)
async def auth_oidc(request: Request) -> RedirectResponse:
    """Handle OIDC callback, exchange code for token, and create/update user."""

    oauth_client: Any = oauth
    oidc = oauth_client.create_client("oidc")

    try:
        token: Any = await oidc.authorize_access_token(request)
    except httpx2.HTTPStatusError as exc:
        raise UnavailableError("OIDC token exchange failed. Verify provider URL and client credentials.") from exc
    except OAuthError as exc:
        raise UnauthorizedError("OIDC callback could not be validated") from exc

    raw_userinfo: Any = getattr(token, "userinfo", None)
    # Fall back to the userinfo endpoint when the token payload does not include profile claims.
    if raw_userinfo is None:
        if isinstance(token, dict):
            token_payload = token
        elif hasattr(token, "model_dump"):
            token_payload = token.model_dump(mode="python")
        elif hasattr(token, "dict"):
            token_payload = token.dict()
        else:
            try:
                token_payload = dict(token)
            except TypeError as exc:
                raise UnavailableError("Authentication provider returned an invalid token payload") from exc

        try:
            raw_userinfo = await oidc.userinfo(token=token_payload)
        except httpx2.HTTPStatusError as exc:
            raise UnavailableError("OIDC userinfo endpoint failed. Verify provider URL and client credentials.") from exc
        except OAuthError as exc:
            raise UnauthorizedError("OIDC userinfo response could not be validated") from exc
        except ValidationError as exc:
            raise UnavailableError("Authentication provider returned an invalid user profile") from exc

    try:
        userinfo = OidcUserInfo.model_validate(raw_userinfo)
    except ValidationError as exc:
        raise UnavailableError("Authentication provider returned an invalid user profile") from exc

    subject = await upsert_oidc_user(userinfo)
    SessionAccountsService(request).activate(subject)
    next_path = request.session.pop(OIDC_NEXT_SESSION_KEY, DEFAULT_POST_LOGIN_REDIRECT)
    return RedirectResponse(sanitize_post_login_redirect(next_path))


@router.post("/auth/logout", response_model=SuccessResponse, include_in_schema=False)
async def logout(request: Request) -> SuccessResponse:
    """Clear the user session and log out."""

    SessionAccountsService(request).remove()
    return SuccessResponse()
