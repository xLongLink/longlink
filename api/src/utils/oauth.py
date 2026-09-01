import base64
import httpx2
import hashlib
from typing import Literal
from pydantic import TypeAdapter, ValidationError
from dataclasses import dataclass
from urllib.parse import urlencode
from src.environments import env
from longlink.shared.models import Email

OAuthProvider = Literal["google", "github"]
EMAIL_ADAPTER: TypeAdapter[Email] = TypeAdapter(Email)
GOOGLE_AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
GITHUB_AUTHORIZATION_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"


@dataclass(frozen=True)
class OAuthIdentity:
    """Represent one verified external identity returned by an OAuth provider."""

    subject: str
    email: Email
    name: str
    avatar: str


def is_configured(provider: OAuthProvider) -> bool:
    """Return whether one OAuth provider has complete runtime credentials."""

    # Providers remain unavailable until both of their confidential credentials are configured.
    if provider == "google":
        return env.GOOGLE_OAUTH_CLIENT_ID is not None and env.GOOGLE_OAUTH_CLIENT_SECRET is not None
    return env.GITHUB_OAUTH_CLIENT_ID is not None and env.GITHUB_OAUTH_CLIENT_SECRET is not None


def redirect_uri(provider: OAuthProvider) -> str:
    """Return the registered public callback URL for one OAuth provider."""

    # The frontend proxy exposes API routes at the same browser-facing public origin.
    return f"{env.PUBLIC_URL.rstrip('/')}/api/v1/auth/oauth/{provider}/callback"


def authorization_url(provider: OAuthProvider, state: str, verifier: str) -> str:
    """Build one provider authorization URL with PKCE protection."""

    # Derive the standards-required S256 challenge without exposing the verifier in the redirect URL.
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode("utf-8")).digest()).decode("ascii").rstrip("=")
    params = {
        "client_id": env.GOOGLE_OAUTH_CLIENT_ID if provider == "google" else env.GITHUB_OAUTH_CLIENT_ID,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "redirect_uri": redirect_uri(provider),
        "response_type": "code",
        "state": state,
    }

    # Request only profile data required to identify an account and verify its email address.
    if provider == "google":
        params["scope"] = "openid email profile"
        return f"{GOOGLE_AUTHORIZATION_URL}?{urlencode(params)}"
    params["scope"] = "read:user user:email"
    return f"{GITHUB_AUTHORIZATION_URL}?{urlencode(params)}"


async def identity(provider: OAuthProvider, code: str, verifier: str) -> OAuthIdentity | None:
    """Exchange one authorization code for a verified provider identity."""

    # Refuse provider traffic without a complete confidential client configuration.
    if not is_configured(provider):
        return None

    # Exchange the single-use authorization code through the provider's fixed HTTPS endpoint.
    try:
        async with httpx2.AsyncClient(follow_redirects=False, timeout=10.0) as client:
            if provider == "google":
                token_response = await client.post(
                    GOOGLE_TOKEN_URL,
                    data={
                        "client_id": env.GOOGLE_OAUTH_CLIENT_ID,
                        "client_secret": env.GOOGLE_OAUTH_CLIENT_SECRET,
                        "code": code,
                        "code_verifier": verifier,
                        "grant_type": "authorization_code",
                        "redirect_uri": redirect_uri(provider),
                    },
                )
            else:
                token_response = await client.post(
                    GITHUB_TOKEN_URL,
                    data={
                        "client_id": env.GITHUB_OAUTH_CLIENT_ID,
                        "client_secret": env.GITHUB_OAUTH_CLIENT_SECRET,
                        "code": code,
                        "code_verifier": verifier,
                        "redirect_uri": redirect_uri(provider),
                    },
                    headers={"Accept": "application/json"},
                )
            if not token_response.is_success:
                return None
            token_payload = token_response.json()
            access_token = _text(token_payload, "access_token", 4096)
            if access_token is None:
                return None

            # Fetch the identity only with the ephemeral access token; it is never persisted.
            authorization = {"Authorization": f"Bearer {access_token}"}
            if provider == "google":
                profile_response = await client.get(GOOGLE_USERINFO_URL, headers=authorization)
                if not profile_response.is_success:
                    return None
                return _google_identity(profile_response.json())
            github_headers = {
                **authorization,
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            }
            profile_response = await client.get(
                GITHUB_USER_URL,
                headers=github_headers,
            )
            emails_response = await client.get(
                GITHUB_EMAILS_URL,
                headers=github_headers,
            )
            if not profile_response.is_success or not emails_response.is_success:
                return None
            return _github_identity(profile_response.json(), emails_response.json())
    except (httpx2.HTTPError, TypeError, ValueError):
        return None


def _google_identity(payload: object) -> OAuthIdentity | None:
    """Validate one Google userinfo response as a verified LongLink identity."""

    # Google authorizes account creation only when its OpenID profile confirms the email ownership.
    if not isinstance(payload, dict) or payload.get("email_verified") is not True:
        return None
    subject = _text(payload, "sub", 255)
    email = _email(payload, "email")
    if subject is None or email is None:
        return None
    return OAuthIdentity(
        subject=subject,
        email=email,
        name=_name(payload, email),
        avatar=_text(payload, "picture", 2048) or "",
    )


def _github_identity(profile: object, emails: object) -> OAuthIdentity | None:
    """Validate GitHub profile and email responses as a verified LongLink identity."""

    # GitHub profiles omit private emails, so use its dedicated email endpoint and require primary verification.
    if not isinstance(profile, dict) or not isinstance(emails, list):
        return None
    raw_subject = profile.get("id")
    subject = str(raw_subject) if isinstance(raw_subject, int) and not isinstance(raw_subject, bool) else None
    if subject is None:
        return None
    email = next(
        (
            verified_email
            for item in emails
            if isinstance(item, dict)
            and item.get("primary") is True
            and item.get("verified") is True
            and (verified_email := _email(item, "email")) is not None
        ),
        None,
    )
    if email is None:
        return None
    return OAuthIdentity(
        subject=subject,
        email=email,
        name=_name(profile, email),
        avatar=_text(profile, "avatar_url", 2048) or "",
    )


def _email(payload: object, field: str) -> Email | None:
    """Return one valid email field from an untrusted provider response."""

    # Apply the same canonical email validation used at LongLink's HTTP boundaries.
    value = _text(payload, field, 254)
    if value is None:
        return None
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
