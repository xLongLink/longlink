import httpx
from typing import cast

from authlib.integrations.starlette_client.apps import StarletteOAuth2App
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse

import src.db as db
from src.auth import oauth
from src.env import env

router = APIRouter(prefix="/auth")


@router.get("/login/oidc")
async def login_oidc(request: Request):
    """Initiate OIDC login flow by redirecting to the identity provider."""
    oidc = cast(StarletteOAuth2App, oauth.create_client("oidc"))

    try:
        return await oidc.authorize_redirect(
            request,
            redirect_uri=env.OIDC_REDIRECT_URI,
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=(
                "OIDC provider metadata is unavailable. "
                "Check OIDC_ISSUER and provider realm configuration."
            ),
        ) from exc


@router.get("/oidc")
async def auth_oidc(request: Request):
    """Handle OIDC callback, exchange code for token, and create/update user."""
    oidc = cast(StarletteOAuth2App, oauth.create_client("oidc"))

    try:
        token = await oidc.authorize_access_token(request)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail="OIDC token exchange failed. Verify provider URL and client credentials.",
        ) from exc

    userinfo = token.get("userinfo")
    if userinfo is None:
        userinfo = await oidc.userinfo(token=token)

    subject = str(userinfo["sub"])
    given_name = userinfo.get("given_name") or "Example"
    family_name = userinfo.get("family_name") or "LongLink"
    email = userinfo.get("email") or "example@longlink.dev"
    name = (
        userinfo.get("name")
        or userinfo.get("preferred_username")
        or f"{given_name} {family_name}"
    )

    user = await db.users.create_or_update_oidc_user(
        oidc_subject=subject,
        email=email,
        name=name,
        avatar=userinfo.get("picture"),
    )

    request.session["userid"] = str(user.id)
    return RedirectResponse(f"{env.URL.rstrip('/')}/organizations")


@router.get("/logout")
async def logout(request: Request):
    """Clear the user session and log out."""
    request.session.clear()
    return RedirectResponse("/")
