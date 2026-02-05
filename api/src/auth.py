import os
import src.db as db
from fastapi import HTTPException, Request
from authlib.integrations.starlette_client import OAuth


oauth = OAuth()
oauth.register(
    name='github',
    client_id=os.getenv('GITHUB_CLIENT_ID'),
    client_secret=os.getenv('GITHUB_CLIENT_SECRET'),
    access_token_url='https://github.com/login/oauth/access_token',
    authorize_url='https://github.com/login/oauth/authorize',
    api_base_url='https://api.github.com/',
    userinfo_endpoint='https://api.github.com/user',
    client_kwargs={'scope': 'read:user user:email'},
    redirect_uri='https://api.swissgpu.ch/auth/github',
)


async def user(request: Request) -> db.User:
    userid = request.session.get('userid')
    if not userid:
        raise HTTPException(401, 'Not authenticated')

    user = await db.users.get(userid)
    return user
