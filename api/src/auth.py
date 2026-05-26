import src.db as db
from authlib.integrations.starlette_client import OAuth
from fastapi import HTTPException, Request
from src.env import env


oauth = OAuth()
oauth.register(
    name="oidc",
    client_id=env.OIDC_CLIENT_ID,
    client_secret=env.OIDC_CLIENT_SECRET,
    server_metadata_url=f"{env.OIDC_ISSUER.rstrip('/')}/.well-known/openid-configuration",
    client_kwargs={"scope": "openid profile email"},
)


async def authuser(request: Request) -> db.User:
    """Authenticate a user from session and return the User object."""

    oidc_subject = request.session.get("oidc_subject")
    if oidc_subject is None:
        raise HTTPException(401, "Not authenticated")

    user = await db.users.get(oidc_subject)
    if not user:
        raise HTTPException(401, "Not authenticated")
    return user
