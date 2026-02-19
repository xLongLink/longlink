import src.db as db
from typing import Any, cast
from fastapi import Request, HTTPException
from src.auth import oauth, AVAILABLE_AUTH_METHODS
from src.router import router
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client.apps import StarletteOAuth2App


URL = 'http://localhost:5173'


@router.get('/login')
async def login_methods():
    return {'methods': AVAILABLE_AUTH_METHODS}


@router.get('/login/github')
async def login_github(request: Request):
    if 'github' not in AVAILABLE_AUTH_METHODS:
        raise HTTPException(404, 'Authentication method not available')

    github = cast(StarletteOAuth2App, oauth.create_client('github'))

    return await github.authorize_redirect(
        request,
        redirect_uri='http://localhost:8000/auth/github',
    )


@router.get('/auth/github')
async def auth_github(request: Request):
    if 'github' not in AVAILABLE_AUTH_METHODS:
        raise HTTPException(404, 'Authentication method not available')

    github = cast(StarletteOAuth2App, oauth.create_client('github'))

    token = await github.authorize_access_token(request)
    userinfo = await github.get('user', token=token)

    github_user = userinfo.json()
    email = github_user.get('email')

    if not email:
        emails_response = await github.get('user/emails', token=token)
        emails = cast(list[dict[str, Any]], emails_response.json())
        primary_verified_email = next(
            (
                entry.get('email')
                for entry in emails
                if entry.get('primary') and entry.get('verified') and entry.get('email')
            ),
            None,
        )
        email = primary_verified_email

    if not email:
        email = '{}@users.noreply.github.com'.format(github_user.get('login') or github_user.get('id'))

    # Ensure that the user exists in our database
    user = await db.users.create(
        name=github_user.get('name') or github_user.get('login'),
        email=email,
        avatar=github_user.get('avatar_url'),
        oauth_github_id=github_user.get('id'),
    )

    request.session['userid'] = user.id
    return RedirectResponse(URL)



@router.get('/logout')
async def logout(request: Request):
    request.session.clear()
    return {'ok': True}
    
