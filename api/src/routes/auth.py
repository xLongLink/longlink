from typing import cast
import src.db as db
from src.auth import oauth
from fastapi import Request
from src.router import router
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client.apps import StarletteOAuth2App


def _safe_return_to(value: str | None) -> str | None:
    if not value:
        return None
    if not value.startswith('/'):
        return None
    if value.startswith('//'):
        return None
    return value


@router.get('/login/github')
async def login_github(request: Request):
    github = cast(StarletteOAuth2App, oauth.create_client('github'))
    return_to = _safe_return_to(request.query_params.get('return_to'))
    if return_to:
        request.session['post_login_redirect'] = return_to

    return await github.authorize_redirect(
        request,
        redirect_uri='http://localhost:8000/auth/github',
    )


@router.get('/auth/github')
async def auth_github(request: Request):
    github = cast(StarletteOAuth2App, oauth.create_client('github'))

    token = await github.authorize_access_token(request)
    userinfo = await github.get('user', token=token)

    # Ensure that the user exists in our database
    user = await db.users.create(
        name=userinfo.json().get('name') or userinfo.json().get('login'),
        email=userinfo.json().get('email') or 'sample@localhost',
        avatar=userinfo.json().get('avatar_url'),
        oauth_github_id=userinfo.json().get('id'),
    )

    request.session['userid'] = user.id
    redirect_to = _safe_return_to(
        request.session.pop('post_login_redirect', None)
    ) or '/'
    return RedirectResponse(redirect_to)



@router.get('/logout')
async def logout(request: Request):
    request.session.clear()
    return {'ok': True}
    
