import src.db as db
from fastapi import HTTPException, Request
from authlib.integrations.starlette_client import OAuth
from src.settings import settings

"""
TODO: We do not create a new authentication system, instead we integrate with existing Identity Providers (IdP)
- SAML 2.0
- OpenID Connect (OIDC)
- OAuth 2.0

IdP
- Microsoft Entra ID (formerly Azure AD)
- Okta
- Ping Identity
- Auth0
- Google Workspace

TODO: MFA (Multi-Factor Authentication)
TODO: Enterprise SCIM 2.0 Support
"""

oauth = OAuth()
AVAILABLE_AUTH_METHODS: list[str] = []


if settings.GITHUB_CLIENT_ID and settings.GITHUB_CLIENT_SECRET:
    oauth.register(
        name='github',
        client_id=settings.GITHUB_CLIENT_ID,
        client_secret=settings.GITHUB_CLIENT_SECRET,
        access_token_url='https://github.com/login/oauth/access_token',
        authorize_url='https://github.com/login/oauth/authorize',
        api_base_url='https://api.github.com/',
        userinfo_endpoint='https://api.github.com/user',
        client_kwargs={'scope': 'read:user user:email'},
        redirect_uri='https://api.swissgpu.ch/auth/github',
    )
    AVAILABLE_AUTH_METHODS.append('github')


async def authuser(request: Request) -> db.User:
    userid = request.session.get('userid')
    if not userid:
        raise HTTPException(401, 'Not authenticated')

    user = await db.users.get(userid)
    if not user:
        raise HTTPException(401, 'Not authenticated')
    return user
