from fastapi import Request, HTTPException
from src.enviroments import env
from authlib.integrations.starlette_client import OAuth
from src.database.models.users import User
from src.database.services.users import users
from src.models.roles import PlatformRole

oauth = OAuth()
oauth.register(
    name="oidc",
    client_id=env.OIDC_CLIENT_ID,
    client_secret=env.OIDC_CLIENT_SECRET,
    server_metadata_url=f"{env.OIDC_ISSUER.rstrip('/')}/.well-known/openid-configuration",
    client_kwargs={"scope": "openid profile email"},
)


async def authuser(request: Request) -> User:
    """Authenticate a user from session and return the User object."""

    oidc_subject = request.session.get("oidc_subject")
    if oidc_subject is None:
        raise HTTPException(401, "Not authenticated")

    user = await users.get(oidc_subject)
    if not user:
        raise HTTPException(401, "Not authenticated")
    return user


async def authadmin(request: Request) -> User:
    """Authenticate an admin user from session and return the User object."""

    user = await authuser(request)

    # Only administrator accounts can continue past this check.
    if user.role != PlatformRole.administrator:
        raise HTTPException(403, "Administrator privileges required")

    return user


async def authsupport(request: Request) -> User:
    """Authenticate a support or administrator user from session."""

    user = await authuser(request)

    if user.role not in {PlatformRole.support, PlatformRole.administrator}:
        raise HTTPException(403, "Support access required")

    return user
