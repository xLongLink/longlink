from typing import cast

import httpx2
from authlib.integrations.starlette_client.apps import StarletteOAuth2App
from fastapi import HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

from src.auth import oauth
from src.database.services.users import users
from src.enviroments import env
from src.router import router
from src.models.common import SuccessResponse


class PasswordLoginRequest(BaseModel):
    """Payload for the password-based login flow."""

    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


@router.get("/auth/login/oidc", include_in_schema=False)
async def login_oidc(request: Request):
    """Initiate OIDC login flow by redirecting to the identity provider."""

    oidc = cast(StarletteOAuth2App, oauth.create_client("oidc"))

    try:
        return await oidc.authorize_redirect(request, redirect_uri=env.OIDC_REDIRECT_URI)
    except httpx2.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=(
                "OIDC provider metadata is unavailable. "
                "Check OIDC_ISSUER and provider realm configuration."
            ),
        ) from exc


@router.post("/auth/login/password", response_model=SuccessResponse, include_in_schema=False)
async def login_password(request: Request, payload: PasswordLoginRequest) -> SuccessResponse:
    """Exchange username/password credentials for a session through Keycloak."""

    # Fetch the provider metadata first so the token and userinfo URLs come from discovery.
    metadata_url = f"{env.OIDC_ISSUER.rstrip('/')}/.well-known/openid-configuration"

    async with httpx2.AsyncClient() as client:
        try:
            metadata_response = await client.get(metadata_url)
            metadata_response.raise_for_status()
        except httpx2.HTTPStatusError as exc:
            raise HTTPException(status_code=502, detail="Authentication provider unavailable") from exc

        metadata = metadata_response.json()

        # Exchange the provided credentials for an access token.
        token_response = await client.post(
            metadata["token_endpoint"],
            data={
                "grant_type": "password",
                "client_id": env.OIDC_CLIENT_ID,
                "client_secret": env.OIDC_CLIENT_SECRET,
                "username": payload.username,
                "password": payload.password,
                "scope": "openid profile email",
            },
        )

    try:
        token_response.raise_for_status()
    except httpx2.HTTPStatusError as exc:
        if exc.response.status_code in {400, 401}:
            raise HTTPException(status_code=401, detail="Invalid username or password") from exc

        raise HTTPException(status_code=502, detail="Authentication provider unavailable") from exc

    token = token_response.json()
    access_token = token.get("access_token")
    if not access_token:
        raise HTTPException(status_code=502, detail="Authentication provider returned no access token")

    # Use the access token to fetch the authenticated user's profile.
    async with httpx2.AsyncClient() as client:
        try:
            userinfo_response = await client.get(
                metadata["userinfo_endpoint"],
                headers={"Authorization": f"Bearer {access_token}"},
            )
            userinfo_response.raise_for_status()
        except httpx2.HTTPStatusError as exc:
            raise HTTPException(status_code=502, detail="Failed to read authenticated user profile") from exc

    userinfo = userinfo_response.json()
    subject = str(userinfo.get("sub") or "")
    if not subject:
        raise HTTPException(status_code=502, detail="Authentication provider returned no subject")

    # Normalize the provider payload into the local user record shape.
    given_name = userinfo.get("given_name") or "Example"
    family_name = userinfo.get("family_name") or "LongLink"
    email = userinfo.get("email") or "example@longlink.dev"
    name = (
        userinfo.get("name")
        or userinfo.get("preferred_username")
        or f"{given_name} {family_name}"
    )

    await users.upsert(
        oidc_subject=subject,
        email=email,
        name=name,
        avatar=userinfo.get("picture"),
    )

    request.session["oidc_subject"] = subject
    return SuccessResponse()


@router.get("/auth/oidc", include_in_schema=False)
async def auth_oidc(request: Request):
    """Handle OIDC callback, exchange code for token, and create/update user."""

    oidc = cast(StarletteOAuth2App, oauth.create_client("oidc"))

    try:
        token = await oidc.authorize_access_token(request)
    except httpx2.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail="OIDC token exchange failed. Verify provider URL and client credentials.",
        ) from exc

    userinfo = token.get("userinfo")
    # Fall back to the userinfo endpoint when the token payload does not include profile claims.
    if userinfo is None:
        userinfo = await oidc.userinfo(token=token)

    # Normalize the provider payload into the local user record shape.
    subject = str(userinfo["sub"])
    given_name = userinfo.get("given_name") or "Example"
    family_name = userinfo.get("family_name") or "LongLink"
    email = userinfo.get("email") or "example@longlink.dev"
    name = (
        userinfo.get("name")
        or userinfo.get("preferred_username")
        or f"{given_name} {family_name}"
    )

    await users.upsert(
        oidc_subject=subject,
        email=email,
        name=name,
        avatar=userinfo.get("picture"),
    )

    request.session["oidc_subject"] = subject
    return RedirectResponse("/organizations")


@router.get("/auth/logout", response_model=SuccessResponse, include_in_schema=False)
async def logout(request: Request) -> SuccessResponse:
    """Clear the user session and log out."""

    request.session.clear()
    return SuccessResponse()
