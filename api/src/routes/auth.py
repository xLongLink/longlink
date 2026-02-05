import src.db as db
from typing import cast
from fastapi import Request
from src.auth import oauth
from src.router import router
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client.apps import StarletteOAuth2App


URL = 'http://localhost:5173'


@router.get('/login/github')
async def login_github(request: Request):
    github = cast(StarletteOAuth2App, oauth.create_client('github'))

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
    return RedirectResponse(URL)



@router.get('/logout')
async def logout(request: Request):
    request.session.clear()
    return {'ok': True}
    
