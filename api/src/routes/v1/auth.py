import jwt
from pwdlib import PasswordHash
from typing import Annotated
from fastapi import Body, Cookie, Header, Depends, Response, APIRouter, HTTPException, BackgroundTasks
from src.auth import get_session
from src.utils import mail, token
from sqlalchemy.exc import IntegrityError
from src.models.auth import EmailPayload, TokenPayload, PasswordLogin, RegistrationComplete, PasswordResetComplete
from src.environments import env
from src.models.users import UserSummary
from src.database.services import users, invitations, organizations
from longlink.shared.models import Email
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["auth"])

@router.post("/auth/password/login", status_code=204)
async def password_login(payload: PasswordLogin, response: Response, session: AsyncSession = Depends(get_session)):
    """Authenticate a local account and create one signed browser session."""

    # Load the canonical account identity before verifying its credential.
    user = await users.by_email(session, payload.email)
    if user is None:
        PasswordHash.recommended().hash(payload.password)
        raise HTTPException(status_code=400, detail="LOGIN_BAD_CREDENTIALS")

    # Verify the supplied password before issuing a session.
    if not PasswordHash.recommended().verify(payload.password, user.password) or user.deleted_at is not None:
        raise HTTPException(status_code=400, detail="LOGIN_BAD_CREDENTIALS")

    # Accept email-bound Organization access before issuing its signed browser session.
    changed_organization_ids = await invitations.accept(session, user)
    await session.commit()

    for organization_id in changed_organization_ids:
        await organizations.sync_users(session, organization_id)
    credential = token.create_auth_token(user)

    # Publish authentication only after all persistent login effects commit.
    response.headers["Cache-Control"] = "no-store"
    response.set_cookie(
        "longlink_auth",
        credential,
        max_age=env.AUTH_SESSION_LIFETIME_SECONDS,
        path="/",
        secure=not env.DEVELOPMENT,
        httponly=True,
        samesite="lax",
    )


@router.post("/auth/logout", status_code=204, include_in_schema=False)
async def logout(
    response: Response,
    origin: str | None = Header(default=None),
):
    """Remove the active browser credential."""

    # Block cross-origin requests from clearing an authenticated browser session.
    public_origin = env.PUBLIC_URL.rstrip("/")
    trusted_origins = {public_origin}
    if env.DEVELOPMENT:
        trusted_origins.add(public_origin.replace("://localhost", "://127.0.0.1"))
        trusted_origins.add(public_origin.replace("://127.0.0.1", "://localhost"))
    if origin is not None and origin not in trusted_origins:
        raise HTTPException(status_code=403, detail="Origin required")

    # Match the authentication-cookie scope so browsers reliably remove the credential.
    response.delete_cookie(
        "longlink_auth",
        path="/",
        secure=not env.DEVELOPMENT,
        httponly=True,
        samesite="lax",
    )


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
    response.set_cookie(
        "longlink_password_reset",
        payload.token,
        max_age=900,
        path="/api/v1/auth/reset-password",
        secure=not env.DEVELOPMENT,
        httponly=True,
        samesite="lax",
    )


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
    user.password = PasswordHash.recommended().hash(payload.password)
    await session.commit()

    # Remove reset proof only after the replacement password commits.
    response.headers["Cache-Control"] = "no-store"
    response.delete_cookie(
        "longlink_password_reset",
        path="/api/v1/auth/reset-password",
        secure=not env.DEVELOPMENT,
        httponly=True,
        samesite="lax",
    )


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
            detail="This registration link is invalid or expired. Request a new link to continue.",
        ) from exc
    response.headers["Cache-Control"] = "no-store"
    response.set_cookie(
        "longlink_registration",
        payload.token,
        max_age=token.EMAIL_TOKEN_LIFETIME_SECONDS,
        path="/api/v1/auth/register",
        secure=not env.DEVELOPMENT,
        httponly=True,
        samesite="lax",
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
            detail="This registration link is invalid or expired. Request a new link to continue.",
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
            detail="This registration link is invalid or expired. Request a new link to continue.",
        ) from exc

    # Prevent another browser tab's setup cookie from changing the displayed account identity.
    if payload.email != email:
        raise HTTPException(
            status_code=409,
            detail="Another registration was verified in this browser. Reopen the link for this email to continue safely.",
        )

    # Reject token replay and concurrent account creation before expensive password hashing.
    if await users.by_email(session, email) is not None:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists. Sign in or reset your password to continue.",
        )

    # Persist the user before its FK-dependent token and treat uniqueness races uniformly.
    try:
        user = await users.register(session, f"{payload.name} {payload.surname}", email, payload.password)
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists. Sign in or reset your password to continue.",
        ) from exc

    changed_organization_ids = await invitations.accept(session, user)
    await session.commit()

    for organization_id in changed_organization_ids:
        await organizations.sync_users(session, organization_id)
    credential = token.create_auth_token(user)

    # Publish browser authentication only after both persistent records commit.
    response.headers["Cache-Control"] = "no-store"
    response.set_cookie(
        "longlink_auth",
        credential,
        max_age=env.AUTH_SESSION_LIFETIME_SECONDS,
        path="/",
        secure=not env.DEVELOPMENT,
        httponly=True,
        samesite="lax",
    )
    response.delete_cookie(
        "longlink_registration",
        path="/api/v1/auth/register",
        secure=not env.DEVELOPMENT,
        httponly=True,
        samesite="lax",
    )
    return user
