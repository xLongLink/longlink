import os
from typing import cast
from fastapi import Request, Response, status
from src.auth import oauth
from src.router import router
from fastapi.responses import RedirectResponse
from fastapi import HTTPException
from authlib.integrations.starlette_client.apps import StarletteOAuth2App


DOMAIN = "localhost"


@router.get("/login/github")
async def login_github(request: Request):
    github = cast(StarletteOAuth2App, oauth.create_client("github"))

    return await github.authorize_redirect(
        request,
        redirect_uri="http://localhost:8000/auth/github"
    )


@router.get("/auth/github")
async def auth_github(request: Request):
    github = cast(StarletteOAuth2App, oauth.create_client("github"))

    token = await github.authorize_access_token(request)
    userinfo = await github.get("user", token=token)
    print(userinfo.json())

    request.session["user"] = {
        "provider": "github",
        "id": str(userinfo.json()["id"]),
        "email": userinfo.json().get("email"),
    }

    return RedirectResponse("/")



@router.get("/logout")
async def logout(request: Request):
    request.session.clear()
    return {"ok": True}
    


@router.get("/me")
async def me(request: Request):
    user = request.session.get("user")
    if not user:
        raise HTTPException(401)
    return user