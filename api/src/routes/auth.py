import src.db as db
from typing import cast
from fastapi import Request, HTTPException
from src.env import env
from src.auth import AVAILABLE_AUTH_METHODS, oauth
from src.router import router
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client.apps import StarletteOAuth2App


@router.get('/login')
async def login_methods() -> list[str]:
    return AVAILABLE_AUTH_METHODS


@router.get('/login/oidc')
async def login_oidc(request: Request):
    if 'oidc' not in AVAILABLE_AUTH_METHODS:
        raise HTTPException(404, 'Authentication method not available')

    oidc = cast(StarletteOAuth2App, oauth.create_client('oidc'))

    return await oidc.authorize_redirect(
        request,
        redirect_uri=env.ENV_OIDC_REDIRECT_URI,
    )


@router.get('/auth/oidc')
async def auth_oidc(request: Request):
    if 'oidc' not in AVAILABLE_AUTH_METHODS:
        raise HTTPException(404, 'Authentication method not available')

    oidc = cast(StarletteOAuth2App, oauth.create_client('oidc'))

    token = await oidc.authorize_access_token(request)
    userinfo = token.get('userinfo')
    if userinfo is None:
        userinfo = await oidc.userinfo(token=token)

    subject = str(userinfo['sub'])
    email = userinfo.get('email') or f'{subject}@users.noreply.oidc'
    name = userinfo.get('name') or userinfo.get('preferred_username') or email

    user = await db.users.create_or_update_oidc_user(
        oidc_subject=subject,
        email=email,
        name=name,
        avatar=userinfo.get('picture'),
    )

    request.session['userid'] = user.id
    return RedirectResponse(env.URL)


@router.get('/logout')
async def logout(request: Request):
    request.session.clear()
    return {'ok': True}
