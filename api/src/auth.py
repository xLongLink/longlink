import os
from src.db import User, get_user_by_id
from fastapi import HTTPException, Request
from authlib.integrations.starlette_client import OAuth


oauth = OAuth()
oauth.register(
    name="github",
    client_id=os.getenv("GITHUB_CLIENT_ID"),
    client_secret=os.getenv("GITHUB_CLIENT_SECRET"),
    access_token_url="https://github.com/login/oauth/access_token",
    authorize_url="https://github.com/login/oauth/authorize",
    api_base_url="https://api.github.com/",
    userinfo_endpoint="https://api.github.com/user",
    client_kwargs={"scope": "read:user user:email"},
    redirect_uri=f"https://api.swissgpu.ch/auth/github",
)


async def user(request: Request) -> User:
    userid = request.session.get("userid")
    if not userid:
        raise HTTPException(401, "Not authenticated")

    user = await get_user_by_id(userid)
    return user