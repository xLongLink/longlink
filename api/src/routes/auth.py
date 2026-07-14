import httpx2
from typing import Literal, Protocol, cast
from fastapi import Query, Request, Response, APIRouter, HTTPException
from pydantic import ValidationError
from src.auth import SessionAccountsService, oauth
from src.utils import urls
from collections.abc import Mapping
from src.models.auth import OidcUserInfo
from src.environments import env
from fastapi.responses import RedirectResponse
from src.database.services import users
from authlib.integrations.base_client import OAuthError

router = APIRouter()


class OidcClient(Protocol):
    """Define the Authlib client behavior used by the OIDC routes."""

    async def authorize_redirect(self, request: Request, redirect_uri: str, **kwargs: str) -> object:
        """Return the provider authorization redirect response."""

        ...

    async def authorize_access_token(self, request: Request) -> object:
        """Exchange an authorization callback for a provider token."""

        ...

    async def userinfo(self, *, token: Mapping[str, object]) -> object:
        """Return profile claims from the provider userinfo endpoint."""

        ...


async def _oidc_userinfo(oidc: OidcClient, token: Mapping[str, object]) -> object:
    """Return profile claims from token userinfo or the provider userinfo endpoint."""

    raw_userinfo = token.get("userinfo")

    # Use profile claims embedded in the token response when Authlib provided them.
    if raw_userinfo is not None:
        return raw_userinfo

    # Request profile claims from the userinfo endpoint.
    try:
        return await oidc.userinfo(token=token)
    except (httpx2.HTTPStatusError, httpx2.RequestError) as exc:
        raise HTTPException(
            status_code=503,
            detail="OIDC userinfo endpoint failed. Verify provider URL and client credentials.",
        ) from exc
    except OAuthError as exc:
        raise HTTPException(status_code=401, detail="OIDC userinfo response could not be validated") from exc
    except ValidationError as exc:
        raise HTTPException(status_code=503, detail="Authentication provider returned an invalid user profile") from exc


async def upsert_oidc_user(userinfo: OidcUserInfo) -> str:
    """Normalize provider profile claims into the local user record."""

    email = userinfo.email

    # Require an email claim from the provider.
    if not email:
        raise HTTPException(status_code=503, detail="Authentication provider returned no email")

    name = userinfo.name or userinfo.preferred_username

    # Build a display name when the provider did not send one.
    if not name:
        given_name = userinfo.given_name
        family_name = userinfo.family_name

        # Require complete name parts before composing a name.
        if not given_name or not family_name:
            raise HTTPException(status_code=503, detail="Authentication provider returned no display name")

        name = f"{given_name} {family_name}"

    # Reject profiles with unverified emails.
    if userinfo.email_verified is not True:
        raise HTTPException(status_code=401, detail="Authentication provider returned an unverified email")

    user = await users.upsert(
        oidc=userinfo.sub,
        email=str(email),
        name=name,
        avatar=userinfo.picture,
    )

    # Prevent deleted users from authenticating.
    if user.deleted_at is not None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    return userinfo.sub


@router.get("/auth/login/oidc", include_in_schema=False)
async def login_oidc(
    request: Request,
    provider: Literal["github", "google"] | None = None,
    next_path: str | None = Query(default=None, alias="next"),
) -> Response:
    """Initiate OIDC login flow by redirecting to the identity provider."""

    oidc = cast(OidcClient | None, oauth.create_client("oidc"))

    # Treat a missing registered client as an unavailable authentication provider.
    if oidc is None:
        raise HTTPException(status_code=503, detail="OIDC provider is unavailable")

    request.session["oidc_next"] = urls.safe_local_path(next_path, "/organizations")
    authorize_kwargs: dict[str, str] = {}

    # Pass through the selected upstream provider hint.
    if provider is not None:
        authorize_kwargs["kc_idp_hint"] = provider

    # Start the provider authorization redirect.
    try:
        response = await oidc.authorize_redirect(
            request,
            redirect_uri=env.OIDC_REDIRECT_URI,
            **authorize_kwargs,
        )

        # Ensure Authlib returned an HTTP response.
        if not isinstance(response, Response):
            raise HTTPException(status_code=503, detail="OIDC provider returned an invalid redirect response")

        return response
    except httpx2.HTTPStatusError as exc:
        raise HTTPException(
            status_code=503,
            detail="OIDC provider metadata is unavailable. Check OIDC_ISSUER and provider realm configuration.",
        ) from exc


@router.get("/auth/oidc", include_in_schema=False)
async def auth_oidc(request: Request) -> RedirectResponse:
    """Handle OIDC callback, exchange code for token, and create/update user."""

    oidc = cast(OidcClient | None, oauth.create_client("oidc"))

    # Treat a missing registered client as an unavailable authentication provider.
    if oidc is None:
        raise HTTPException(status_code=503, detail="OIDC provider is unavailable")

    # Exchange the callback code for a provider token.
    try:
        raw_token = await oidc.authorize_access_token(request)
    except (httpx2.HTTPStatusError, httpx2.RequestError) as exc:
        raise HTTPException(
            status_code=503,
            detail="OIDC token exchange failed. Verify provider URL and client credentials.",
        ) from exc
    except OAuthError as exc:
        raise HTTPException(status_code=401, detail="OIDC callback could not be validated") from exc

    # Authlib token responses are mappings; reject unexpected provider client output.
    if not isinstance(raw_token, Mapping):
        raise HTTPException(status_code=503, detail="OIDC provider returned an invalid token response")

    token: Mapping[str, object] = raw_token
    raw_userinfo = await _oidc_userinfo(oidc, token)

    # Validate the provider profile payload.
    try:
        userinfo = OidcUserInfo.model_validate(raw_userinfo)
    except ValidationError as exc:
        raise HTTPException(status_code=503, detail="Authentication provider returned an invalid user profile") from exc

    subject = await upsert_oidc_user(userinfo)
    SessionAccountsService(request).activate(subject)
    next_path = request.session.pop("oidc_next", "/organizations")
    return RedirectResponse(urls.safe_local_path(next_path, "/organizations"))


@router.post("/auth/logout", status_code=204, include_in_schema=False)
async def logout(request: Request):
    """Clear the user session and log out."""

    SessionAccountsService(request).remove()
