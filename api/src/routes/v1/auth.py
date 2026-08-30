import jwt
import hmac
import secrets
from pwdlib import PasswordHash
from typing import Annotated
from fastapi import Body, Query, Cookie, Header, Depends, Response, APIRouter, HTTPException, BackgroundTasks
from src.auth import get_session
from src.utils import mail, oauth, token, cookies
from sqlalchemy.exc import IntegrityError
from src.models.auth import EmailPayload, TokenPayload, PasswordLogin, OAuthAvailability, RegistrationComplete, PasswordResetComplete
from src.environments import env
from src.models.users import UserSummary
from fastapi.responses import RedirectResponse
from src.database.services import users, invitations, organizations
from longlink.shared.models import Email
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["auth"])

INVALID_REGISTRATION_LINK = "This registration link is invalid or expired. Request a new link to continue."
PASSWORD_HASHER = PasswordHash.recommended()
OAUTH_STATE_COOKIE = "longlink_oauth"
OAUTH_STATE_COOKIE_PATH = "/api/v1/auth/oauth"


def set_auth_session(response: Response, credential: str) -> None:
    """Apply the browser response policy for one signed authentication credential."""

    # Publish authentication as a private, browser-only session.
    response.headers["Cache-Control"] = "no-store"
    cookies.set_browser_cookie(response, "longlink_auth", credential, "/", env.AUTH_SESSION_LIFETIME_SECONDS)


def oauth_failure_response() -> RedirectResponse:
    """Return a generic failed OAuth redirect after removing transient state."""

    # Do not expose provider or account details through the browser-facing failure response.
    response = RedirectResponse(f"{env.PUBLIC_URL.rstrip('/')}/login?oauth_error=1", status_code=302)
    response.headers["Cache-Control"] = "no-store"
    cookies.delete_browser_cookie(response, OAUTH_STATE_COOKIE, OAUTH_STATE_COOKIE_PATH)
    return response


@router.get("/auth/oauth", response_model=OAuthAvailability)
async def get_oauth_availability():
    """Return which external sign-in providers have complete configuration."""

    # Expose provider availability without disclosing any confidential client credentials.
    return {
        "github": oauth.is_configured("github"),
        "google": oauth.is_configured("google"),
    }


@router.get("/auth/oauth/{provider}", include_in_schema=False)
async def start_oauth_login(provider: oauth.OAuthProvider):
    """Start one provider sign-in flow with browser-bound state and PKCE proof."""

    # Enabled providers require their complete server-only confidential client configuration.
    if not oauth.is_configured(provider):
        raise HTTPException(status_code=404, detail="OAuth provider is not configured")
    state = secrets.token_urlsafe(32)
    verifier = secrets.token_urlsafe(64)
    credential = token.create_oauth_state_token(provider, state, verifier)
    response = RedirectResponse(oauth.authorization_url(provider, state, verifier), status_code=302)

    # Store callback proof outside browser-readable storage and restrict it to OAuth endpoints.
    response.headers["Cache-Control"] = "no-store"
    cookies.set_browser_cookie(response, OAUTH_STATE_COOKIE, credential, OAUTH_STATE_COOKIE_PATH, token.OAUTH_STATE_TOKEN_LIFETIME_SECONDS)
    return response


@router.get("/auth/oauth/{provider}/callback", include_in_schema=False)
async def complete_oauth_login(
    provider: oauth.OAuthProvider,
    session: AsyncSession = Depends(get_session),
    code: Annotated[str | None, Query(max_length=4096)] = None,
    state: Annotated[str | None, Query(max_length=512)] = None,
    error: Annotated[str | None, Query(max_length=128)] = None,
    oauth_state: str | None = Cookie(default=None, alias=OAUTH_STATE_COOKIE),
):
    """Complete one verified provider sign-in and issue a LongLink browser session."""

    # Validate the provider callback before processing a provider-declared cancellation or failure.
    try:
        expected_state, verifier = token.oauth_state_claims(oauth_state or "", provider)
    except jwt.PyJWTError:
        return oauth_failure_response()
    if state is None or not hmac.compare_digest(expected_state, state) or error is not None or code is None:
        return oauth_failure_response()

    # Exchange the provider code only after the local callback proof has been verified.
    identity = await oauth.identity(provider, code, verifier)
    if identity is None:
        return oauth_failure_response()

    # Resolve a stable provider identity before safely linking verified email ownership.
    user = await users.by_oauth_identity(session, provider, identity.subject)
    if user is None:
        user = await users.by_email(session, identity.email)
        if user is None:
            user = await users.register(
                session,
                identity.name,
                identity.email,
                secrets.token_urlsafe(48),
                identity.avatar,
            )
        if provider == "google":
            user.google_id = identity.subject
        else:
            user.github_id = identity.subject

    # Deleted accounts remain inaccessible even if their provider identity is still valid.
    if user.deleted_at is not None:
        return oauth_failure_response()
    try:
        changed_organization_ids = await invitations.accept(session, user)
        await session.commit()
    except IntegrityError:
        await session.rollback()
        return oauth_failure_response()

    # Complete pending membership projection before publishing the signed browser credential.
    for organization_id in changed_organization_ids:
        await organizations.sync_users(session, organization_id)
    response = RedirectResponse(f"{env.PUBLIC_URL.rstrip('/')}/user/organizations", status_code=302)
    credential = token.create_auth_token(user)

    # Publish authentication only after all persistent OAuth login effects commit.
    set_auth_session(response, credential)
    cookies.delete_browser_cookie(response, OAUTH_STATE_COOKIE, OAUTH_STATE_COOKIE_PATH)
    return response


# Deployment rate limiting bounds unauthenticated credential work before it reaches the API.
@router.post("/auth/password/login", status_code=204)
async def password_login(payload: PasswordLogin, response: Response, session: AsyncSession = Depends(get_session)):
    """Authenticate a local account and create one signed browser session."""

    # Load the canonical account identity before verifying its credential.
    user = await users.by_email(session, payload.email)
    if user is None:
        PASSWORD_HASHER.hash(payload.password)
        raise HTTPException(status_code=400, detail="LOGIN_BAD_CREDENTIALS")

    # Verify the supplied password before issuing a session.
    if not PASSWORD_HASHER.verify(payload.password, user.password) or user.deleted_at is not None:
        raise HTTPException(status_code=400, detail="LOGIN_BAD_CREDENTIALS")

    # Accept email-bound Organization access before issuing its signed browser session.
    changed_organization_ids = await invitations.accept(session, user)
    await session.commit()

    for organization_id in changed_organization_ids:
        await organizations.sync_users(session, organization_id)
    credential = token.create_auth_token(user)

    # Publish authentication only after all persistent login effects commit.
    set_auth_session(response, credential)


@router.post("/auth/logout", status_code=204, include_in_schema=False)
async def logout(
    response: Response,
    origin: str | None = Header(default=None),
):
    """Remove the active browser credential."""

    # Block cross-origin requests from clearing an authenticated browser session.
    if origin is not None and origin not in env.trusted_origins():
        raise HTTPException(status_code=403, detail="Origin required")

    # Match the authentication-cookie scope so browsers reliably remove the credential.
    cookies.delete_browser_cookie(response, "longlink_auth", "/")


# Deployment rate limiting bounds unauthenticated email delivery requests before they reach the API.
@router.post("/auth/forgot-password", status_code=202)
async def request_password_reset(
    email: Annotated[Email, Body(embed=True)],
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
):
    """Queue password reset delivery without disclosing account existence."""

    # Missing and inactive accounts receive the same response as eligible accounts.
    user = await users.by_email(session, email)
    if user is None or user.deleted_at is not None:
        return

    # Generate signed proof and perform SMTP delivery only after the response has been sent.
    credential = token.create_password_reset_token(user)
    background_tasks.add_task(
        mail.send_password_reset_email,
        user.email,
        credential,
    )


@router.post("/auth/reset-password/verify", status_code=204)
async def verify_password_reset_token(payload: TokenPayload, response: Response, session: AsyncSession = Depends(get_session)):
    """Exchange an emailed reset bearer token for browser-only proof."""

    # Validate the bearer credential before moving it into a restricted cookie.
    try:
        await token.password_reset_user(session, payload.token)
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=400, detail="RESET_PASSWORD_BAD_TOKEN") from exc
    response.headers["Cache-Control"] = "no-store"
    cookies.set_browser_cookie(response, "longlink_password_reset", payload.token, "/api/v1/auth/reset-password", 900)


@router.get("/auth/reset-password/setup", status_code=204)
async def get_password_reset_setup(
    response: Response,
    password_reset_token: str | None = Cookie(default=None, alias="longlink_password_reset"),
    session: AsyncSession = Depends(get_session),
):
    """Restore password reset state from browser-only proof."""

    # Refreshes validate only the restricted cookie, never an exposed URL credential.
    try:
        await token.password_reset_user(session, password_reset_token or "")
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=400, detail="RESET_PASSWORD_BAD_TOKEN") from exc
    response.headers["Cache-Control"] = "no-store"


@router.post("/auth/reset-password", status_code=204)
async def reset_password(
    payload: PasswordResetComplete,
    response: Response,
    password_reset_token: str | None = Cookie(default=None, alias="longlink_password_reset"),
    session: AsyncSession = Depends(get_session),
):
    """Replace a password using browser-only reset proof."""

    # Resolve the active account from one valid, current password-reset credential.
    try:
        user = await token.password_reset_user(session, password_reset_token or "")
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=400, detail="RESET_PASSWORD_BAD_TOKEN") from exc

    # Replace the credential so password-bound browser sessions become invalid.
    user.password = PASSWORD_HASHER.hash(payload.password)
    await session.commit()

    # Remove reset proof only after the replacement password commits.
    response.headers["Cache-Control"] = "no-store"
    cookies.delete_browser_cookie(response, "longlink_password_reset", "/api/v1/auth/reset-password")


# Deployment rate limiting bounds unauthenticated email delivery requests before they reach the API.
@router.post("/auth/register", status_code=202)
async def request_registration(
    email: Annotated[Email, Body(embed=True)], background_tasks: BackgroundTasks, session: AsyncSession = Depends(get_session)
):
    """Send a stateless registration link when the email has no account."""

    # Keep the response non-enumerating while avoiding registration mail for existing accounts.
    if await users.by_email(session, email) is not None:
        return

    # Email proof contains no password or pending user identifier.
    credential = token.create_registration_token(email)
    background_tasks.add_task(mail.send_signup_verification_email, email, credential)


@router.post("/auth/verify", response_model=EmailPayload)
async def verify_registration_token(payload: TokenPayload, response: Response):
    """Validate an emailed registration token without creating an account."""

    # Convert invalid and expired tokens into one stable authentication error.
    try:
        email = token.registration_claims(payload.token)
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=400,
            detail=INVALID_REGISTRATION_LINK,
        ) from exc
    response.headers["Cache-Control"] = "no-store"
    cookies.set_browser_cookie(
        response, "longlink_registration", payload.token, "/api/v1/auth/register", token.EMAIL_TOKEN_LIFETIME_SECONDS
    )
    return {"email": email}


@router.get("/auth/register/setup", response_model=EmailPayload)
async def get_registration_setup(response: Response, registration_token: str | None = Cookie(default=None, alias="longlink_registration")):
    """Restore verified registration state from its browser-only cookie."""

    # Refreshes never need the emailed credential after its initial exchange.
    try:
        email = token.registration_claims(registration_token or "")
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=400,
            detail=INVALID_REGISTRATION_LINK,
        ) from exc
    response.headers["Cache-Control"] = "no-store"
    return {"email": email}


@router.post("/auth/register/complete", response_model=UserSummary, status_code=201)
async def complete_registration(
    payload: RegistrationComplete,
    response: Response,
    registration_token: str | None = Cookie(default=None, alias="longlink_registration"),
    session: AsyncSession = Depends(get_session),
):
    """Create and authenticate an account after stateless email verification."""

    # Bind account creation to the signed email rather than any client-supplied identity.
    try:
        email = token.registration_claims(registration_token or "")
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=400,
            detail=INVALID_REGISTRATION_LINK,
        ) from exc

    # Persist the user before its FK-dependent token and treat uniqueness races uniformly.
    try:
        user = await users.register(session, payload.name, email, payload.password)
        changed_organization_ids = await invitations.accept(session, user)
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists. Sign in or reset your password to continue.",
        ) from exc

    for organization_id in changed_organization_ids:
        await organizations.sync_users(session, organization_id)
    credential = token.create_auth_token(user)

    # Publish browser authentication only after both persistent records commit.
    set_auth_session(response, credential)
    cookies.delete_browser_cookie(response, "longlink_registration", "/api/v1/auth/register")
    return user
