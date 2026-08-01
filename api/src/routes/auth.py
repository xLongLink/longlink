import jwt
from pwdlib import PasswordHash
from fastapi import Cookie, Depends, Response, APIRouter, HTTPException, BackgroundTasks
from sqlmodel import col, select
from src.auth import get_auth_session
from src.utils import mail, token
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from src.models.auth import EmailPayload, TokenPayload, PasswordLogin, RegistrationComplete, PasswordResetComplete
from src.environments import env
from src.models.roles import PlatformRoles
from src.models.users import UserProfile
from src.database.services import invitations
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User

router = APIRouter()


@router.post("/api/auth/password/login", status_code=204, tags=["auth"])
async def password_login(payload: PasswordLogin, response: Response, session: AsyncSession = Depends(get_auth_session)):
    """Authenticate a local account and create one signed browser session."""

    # Load the case-insensitive account identity before verifying its credential.
    statement = select(User).where(func.lower(col(User.email)) == func.lower(payload.email))
    user = (await session.execute(statement)).scalar_one_or_none()
    if user is None:
        PasswordHash.recommended().hash(payload.password)
        raise HTTPException(status_code=400, detail="LOGIN_BAD_CREDENTIALS")

    # Verify the supplied password before issuing a session.
    if not PasswordHash.recommended().verify(payload.password, user.hashed_password) or user.deleted_at is not None:
        raise HTTPException(status_code=400, detail="LOGIN_BAD_CREDENTIALS")

    # Accept email-bound Organization access before issuing its signed browser session.
    await session.commit()
    await invitations.accept(user.id)
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


@router.post("/api/auth/logout", status_code=204, include_in_schema=False)
async def logout(
    response: Response,
):
    """Remove the active browser credential."""

    # Match the authentication-cookie scope so browsers reliably remove the credential.
    response.delete_cookie(
        "longlink_auth",
        path="/",
        secure=not env.DEVELOPMENT,
        httponly=True,
        samesite="lax",
    )


@router.post("/api/auth/forgot-password", status_code=202, tags=["auth"])
async def request_password_reset(
    payload: EmailPayload,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_auth_session),
):
    """Queue password reset delivery without disclosing account existence."""

    # Missing and inactive accounts receive the same response as eligible accounts.
    statement = select(User).where(func.lower(col(User.email)) == func.lower(payload.email), col(User.deleted_at).is_(None))
    user = (await session.execute(statement)).scalar_one_or_none()
    if user is None:
        return

    # Generate signed proof and perform SMTP delivery only after the response has been sent.
    credential = token.create_password_reset_token(user)
    background_tasks.add_task(
        mail.send_password_reset_email,
        user.email,
        credential,
    )


@router.post("/api/auth/reset-password/verify", status_code=204, tags=["auth"])
async def verify_password_reset_token(payload: TokenPayload, response: Response, session: AsyncSession = Depends(get_auth_session)):
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
        path="/api/auth/reset-password",
        secure=not env.DEVELOPMENT,
        httponly=True,
        samesite="lax",
    )


@router.get("/api/auth/reset-password/setup", status_code=204, tags=["auth"])
async def get_password_reset_setup(
    response: Response,
    password_reset_token: str | None = Cookie(default=None, alias="longlink_password_reset"),
    session: AsyncSession = Depends(get_auth_session),
):
    """Restore password reset state from browser-only proof."""

    # Refreshes validate only the restricted cookie, never an exposed URL credential.
    try:
        await token.password_reset_user(session, password_reset_token or "")
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=400, detail="RESET_PASSWORD_BAD_TOKEN") from exc
    response.headers["Cache-Control"] = "no-store"


@router.post("/api/auth/reset-password", status_code=204, tags=["auth"])
async def reset_password(
    payload: PasswordResetComplete,
    response: Response,
    password_reset_token: str | None = Cookie(default=None, alias="longlink_password_reset"),
    session: AsyncSession = Depends(get_auth_session),
):
    """Replace a password using browser-only reset proof."""

    # Resolve the active account from one valid, current password-reset credential.
    try:
        user = await token.password_reset_user(session, password_reset_token or "")
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=400, detail="RESET_PASSWORD_BAD_TOKEN") from exc

    # Replace the credential so password-bound browser sessions become invalid.
    user.hashed_password = PasswordHash.recommended().hash(payload.password)
    await session.commit()

    # Remove reset proof only after the replacement password commits.
    response.headers["Cache-Control"] = "no-store"
    response.delete_cookie(
        "longlink_password_reset",
        path="/api/auth/reset-password",
        secure=not env.DEVELOPMENT,
        httponly=True,
        samesite="lax",
    )


@router.post("/api/auth/register", status_code=202, tags=["auth"])
async def request_registration(payload: EmailPayload, background_tasks: BackgroundTasks, session: AsyncSession = Depends(get_auth_session)):
    """Send a stateless registration link when the email has no account."""

    email = payload.email

    # Keep the response non-enumerating while avoiding registration mail for existing accounts.
    statement = select(User.id).where(func.lower(col(User.email)) == func.lower(email))
    if (await session.execute(statement)).scalar_one_or_none() is not None:
        return

    # Email proof contains no password or pending user identifier.
    credential = token.create_registration_token(email)
    background_tasks.add_task(mail.send_signup_verification_email, email, credential)


@router.post("/api/auth/verify", response_model=EmailPayload, tags=["auth"])
async def verify_registration_token(payload: TokenPayload, response: Response):
    """Validate an emailed registration token without creating an account."""

    # Convert invalid and expired tokens into one stable authentication error.
    try:
        email = token.registration_claims(payload.token)
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=400, detail="VERIFY_USER_BAD_TOKEN") from exc
    response.headers["Cache-Control"] = "no-store"
    response.set_cookie(
        "longlink_registration",
        payload.token,
        max_age=token.EMAIL_TOKEN_LIFETIME_SECONDS,
        path="/api/auth/register",
        secure=not env.DEVELOPMENT,
        httponly=True,
        samesite="lax",
    )
    return {"email": email}


@router.get("/api/auth/register/setup", response_model=EmailPayload, tags=["auth"])
async def get_registration_setup(response: Response, registration_token: str | None = Cookie(default=None, alias="longlink_registration")):
    """Restore verified registration state from its browser-only cookie."""

    # Refreshes never need the emailed credential after its initial exchange.
    try:
        email = token.registration_claims(registration_token or "")
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=400, detail="VERIFY_USER_BAD_TOKEN") from exc
    response.headers["Cache-Control"] = "no-store"
    return {"email": email}


@router.post("/api/auth/register/complete", response_model=UserProfile, status_code=201, tags=["auth"])
async def complete_registration(
    payload: RegistrationComplete,
    response: Response,
    registration_token: str | None = Cookie(default=None, alias="longlink_registration"),
    session: AsyncSession = Depends(get_auth_session),
):
    """Create and authenticate an account after stateless email verification."""

    # Bind account creation to the signed email rather than any client-supplied identity.
    try:
        email = token.registration_claims(registration_token or "")
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=400, detail="VERIFY_USER_BAD_TOKEN") from exc

    # Prevent another browser tab's setup cookie from changing the displayed account identity.
    if payload.email != email:
        raise HTTPException(status_code=400, detail="REGISTER_SETUP_MISMATCH")

    # Reject token replay and concurrent account creation before expensive password hashing.
    statement = select(User.id).where(func.lower(col(User.email)) == func.lower(email))
    if (await session.execute(statement)).scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="REGISTER_USER_ALREADY_EXISTS")

    # Build the authenticated account before issuing its first signed browser session.
    user = User(
        name=f"{payload.name} {payload.surname}",
        email=email,
        hashed_password=PasswordHash.recommended().hash(payload.password),
        role=PlatformRoles.user,
    )
    session.add(user)

    # Persist the user before its FK-dependent token and treat uniqueness races uniformly.
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=400, detail="REGISTER_USER_ALREADY_EXISTS") from exc

    await invitations.accept(user.id)
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
        path="/api/auth/register",
        secure=not env.DEVELOPMENT,
        httponly=True,
        samesite="lax",
    )
    return user
