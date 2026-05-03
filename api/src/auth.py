import src.db as db
from fastapi import Request, HTTPException
from src.env import env
from authlib.integrations.starlette_client import OAuth

oauth = OAuth()
oauth.register(
    name="oidc",
    client_id=env.OIDC_CLIENT_ID,
    client_secret=env.OIDC_CLIENT_SECRET,
    server_metadata_url=f"{env.OIDC_ISSUER.rstrip('/')}/.well-known/openid-configuration",
    client_kwargs={"scope": env.OIDC_SCOPES},
)


async def authuser(request: Request) -> db.User:
    """Authenticate a user from session and return the User object."""
    userid = request.session.get("userid")
    if not userid:
        raise HTTPException(401, "Not authenticated")

    user = await db.users.get(userid)
    if not user:
        raise HTTPException(401, "Not authenticated")
    return user
