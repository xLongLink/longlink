import os
import src.db as db
from fastapi import HTTPException, Request, Response, status
from datetime import UTC, datetime
from src.auth import create_token, oauth
from src.router import router
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuthError


@router.get("/auth/github")
async def auth_github(request: Request):
    token = await oauth.github.authorize_access_token(request)
    userinfo = await oauth.github.parse_id_token(request, token) \
        if "id_token" in token else await oauth.github.get("user", token=token)

    request.session["user"] = {
        "provider": "github",
        "id": str(userinfo["id"]),
        "email": userinfo.get("email"),
    }

    return RedirectResponse("/")


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response):
    """Log out the user by clearing the access token cookie."""
    DOMAIN = os.getenv("DOMAIN")

    response.delete_cookie(
        key="access_token",
        path="/",
        domain=DOMAIN,
        secure=True,
        samesite="lax",
        httponly=True,
    )
    