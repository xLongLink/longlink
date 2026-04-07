import src.db as db
from fastapi import Request, HTTPException
from src.env import env
from authlib.integrations.starlette_client import OAuth

oauth = OAuth()


def _oidc_enabled() -> bool:
    return bool(env.ENV_OIDC_ISSUER and env.ENV_OIDC_CLIENT_ID and env.ENV_OIDC_CLIENT_SECRET)


if not _oidc_enabled():
    raise RuntimeError('OIDC bridge authentication is required but not configured.')

oauth.register(
    name='oidc',
    client_id=env.ENV_OIDC_CLIENT_ID,
    client_secret=env.ENV_OIDC_CLIENT_SECRET,
    server_metadata_url=f"{env.ENV_OIDC_ISSUER.rstrip('/')}/.well-known/openid-configuration",
    client_kwargs={'scope': env.ENV_OIDC_SCOPES},
)


async def authuser(request: Request) -> db.User:
    userid = request.session.get('userid')
    if not userid:
        raise HTTPException(401, 'Not authenticated')

    user = await db.users.get(userid)
    if not user:
        raise HTTPException(401, 'Not authenticated')
    return user


async def authapp(request: Request) -> db.App:
    auth_header = request.headers.get('authorization')
    token = request.headers.get('x-app-token')

    if auth_header and auth_header.lower().startswith('bearer '):
        token = auth_header[7:].strip()

    if not token:
        raise HTTPException(401, 'Missing app token')

    app = await db.apps.get_by_key(token)
    if app is None:
        raise HTTPException(401, 'Invalid app token')

    return app
