import os
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


# oauth.register(
#     name="google",
#     client_id=os.getenv("GOOGLE_CLIENT_ID"),
#     client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
#     server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
#     userinfo_endpoint="https://openidconnect.googleapis.com/v1/userinfo",
#     client_kwargs={"scope": "openid email profile"},
#     redirect_uri=f"https://api.swissgpu.ch/auth/google",
# )


async def user(request: Request) -> dict:
    session_user = request.session.get("user")
    if not session_user:
        raise HTTPException(401, "Not authenticated")

    return {}
