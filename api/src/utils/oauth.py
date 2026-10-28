import httpx2
from typing import Literal
from pydantic import TypeAdapter, ValidationError
from dataclasses import dataclass
from longlink.types import Email
from src.environments import env
from authlib.oauth2.client import OAuth2Client
from authlib.integrations.base_client import OAuthError
from authlib.integrations.httpx_client import AsyncOAuth2Client

OAuthProvider = Literal["google", "github"]
GOOGLE_AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
GITHUB_AUTHORIZATION_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"

# Compile canonical email validation once for all provider identity candidates.
EMAIL_ADAPTER = TypeAdapter(Email)


@dataclass(frozen=True)
class OAuthIdentity:
    """Represent one verified external identity returned by an OAuth provider."""

    subject: str
    email: Email
    name: str
    avatar: str


def login_destination(value: str | None) -> str:
    """Continue provider login only to first-party MCP approval, never an arbitrary callback."""

    if value is not None and value.startswith("/mcp/authorize?") and len(value) <= 8192 and "\r" not in value and "\n" not in value:
        return value
    return "/user/organizations"


def is_configured(provider: OAuthProvider) -> bool:
    """Return whether one OAuth provider has complete runtime credentials."""

    # The environment validator guarantees client credentials arrive as a complete pair.
    if provider == "google":
        return env.GOOGLE_OAUTH_CLIENT_ID is not None
    return env.GITHUB_OAUTH_CLIENT_ID is not None


def redirect_uri(provider: OAuthProvider) -> str:
    """Return the registered public callback URL for one OAuth provider."""

    # The frontend proxy exposes API routes at the same browser-facing public origin.
    return f"{env.PUBLIC_URL}/api/v1/auth/oauth/{provider}/callback"


def authorization_url(provider: OAuthProvider, state: str, verifier: str) -> str:
    """Build one provider authorization URL with PKCE protection."""

    # Build PKCE authorization without allocating an HTTP client.
    client = OAuth2Client(
        session=None,
        client_id=env.GOOGLE_OAUTH_CLIENT_ID if provider == "google" else env.GITHUB_OAUTH_CLIENT_ID,
        scope="openid email profile" if provider == "google" else "read:user user:email",
        redirect_uri=redirect_uri(provider),
        code_challenge_method="S256",
    )

    # Bind browser state and PKCE proof to the provider authorization request.
    url, _ = client.create_authorization_url(
        GOOGLE_AUTHORIZATION_URL if provider == "google" else GITHUB_AUTHORIZATION_URL, state=state, code_verifier=verifier
    )
    return url


async def identity(provider: OAuthProvider, code: str, verifier: str) -> OAuthIdentity | None:
    """Exchange one authorization code for a verified provider identity."""

    # Refuse provider traffic without a complete confidential client configuration.
    if not is_configured(provider):
        return None

    # Exchange the single-use authorization code through the provider's fixed HTTPS endpoint.
    try:

        # Reject HTTP failures even when a provider returns a token-shaped error body.
        async with AsyncOAuth2Client(
            client_id=env.GOOGLE_OAUTH_CLIENT_ID if provider == "google" else env.GITHUB_OAUTH_CLIENT_ID,
            client_secret=env.GOOGLE_OAUTH_CLIENT_SECRET if provider == "google" else env.GITHUB_OAUTH_CLIENT_SECRET,
            token_endpoint_auth_method="client_secret_post",
            redirect_uri=redirect_uri(provider),
            follow_redirects=False,
            # Bound provider I/O without inheriting redirect behavior.
            timeout=10.0,
        ) as client:
            client.register_compliance_hook("access_token_response", httpx2.Response.raise_for_status)
            token = await client.fetch_token(
                GOOGLE_TOKEN_URL if provider == "google" else GITHUB_TOKEN_URL,
                grant_type="authorization_code",
                code=code,
                code_verifier=verifier,
            )

            # Do not accept a token-shaped error response as provider authentication.
            if _text(token, "access_token", 4096) is None:
                return None
            token.setdefault("token_type", "Bearer")

            # Fetch the identity only with the ephemeral access token; it is never persisted.
            if provider == "google":
                profile_response = await client.get(GOOGLE_USERINFO_URL)
                profile_response.raise_for_status()
                return _google_identity(profile_response.json())
            github_headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
            profile_response = await client.get(GITHUB_USER_URL, headers=github_headers)
            profile_response.raise_for_status()

            # GitHub email ownership comes from its verified-email endpoint.
            emails_response = await client.get(GITHUB_EMAILS_URL, headers=github_headers)
            emails_response.raise_for_status()
            return _github_identity(profile_response.json(), emails_response.json())
    except (OAuthError, httpx2.HTTPError, TypeError, ValueError):
        return None


def _google_identity(payload: object) -> OAuthIdentity | None:
    """Validate one Google userinfo response as a verified LongLink identity."""

    # Google authorizes account creation only when its OpenID profile confirms the email ownership.
    if not isinstance(payload, dict) or payload.get("email_verified") is not True:
        return None
    subject = _text(payload, "sub", 255)
    email = _email(payload)
    if subject is None or email is None:
        return None
    return OAuthIdentity(subject=subject, email=email, name=_name(payload, email), avatar=_text(payload, "picture", 2048) or "")


def _github_identity(profile: object, emails: object) -> OAuthIdentity | None:
    """Validate GitHub profile and email responses as a verified LongLink identity."""

    # GitHub profiles omit private emails, so use its dedicated email endpoint and require primary verification.
    if not isinstance(profile, dict) or not isinstance(emails, list):
        return None
    raw_subject = profile.get("id")
    subject = str(raw_subject) if isinstance(raw_subject, int) and not isinstance(raw_subject, bool) else None
    if subject is None:
        return None

    # Select the first valid primary verified email without trusting profile email visibility.
    for item in emails:
        if not isinstance(item, dict) or item.get("primary") is not True or item.get("verified") is not True:
            continue

        # Link only a validated primary, verified email address.
        email = _email(item)
        if email is not None:
            return OAuthIdentity(subject=subject, email=email, name=_name(profile, email), avatar=_text(profile, "avatar_url", 2048) or "")
    return None


def _email(payload: object) -> Email | None:
    """Return one valid email field from an untrusted provider response."""

    # Apply the same canonical email validation used at LongLink's HTTP boundaries.
    value = _text(payload, "email", 254)
    if value is None:
        return None

    # Normalize provider email data through the shared address validator.
    try:
        return EMAIL_ADAPTER.validate_python(value)
    except ValidationError:
        return None


def _name(payload: object, email: Email) -> str:
    """Return a bounded profile name with an email-derived fallback."""

    # Keep an immediately usable local profile when providers omit an optional display name.
    return _text(payload, "name", 255) or _text(payload, "login", 255) or email.partition("@")[0]


def _text(payload: object, field: str, maximum_length: int) -> str | None:
    """Return one nonempty bounded string from an untrusted JSON object."""

    # Reject unexpected response structures and oversized provider fields before persisting them.
    if not isinstance(payload, dict):
        return None
    value = payload.get(field)
    if not isinstance(value, str) or not value or len(value) > maximum_length:
        return None
    return value
