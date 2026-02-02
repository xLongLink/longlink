from typing import cast
from src.db import add_user
from fastapi import Request, HTTPException
from src.auth import oauth
from src.router import router
from fastapi.responses import RedirectResponse
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

    # Ensure that the user exists in our database
    user = await add_user(
        name=userinfo.json().get("name") or userinfo.json().get("login"),
        email=userinfo.json().get("email") or f"{userinfo.json().get('login')}@{DOMAIN}",
        avatar=userinfo.json().get("avatar_url"),
        oauth_github_id=userinfo.json().get("id"),
    )

    request.session["user"] = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "avatar": user.avatar,
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
        raise HTTPException(401, "Not authenticated")
    return user