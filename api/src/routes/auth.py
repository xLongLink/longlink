import time
from fastapi import Cookie, Depends, Request, Response, APIRouter, HTTPException, BackgroundTasks
from sqlmodel import col, select
from src.auth import (REGISTRATION_COOKIE, PASSWORD_RESET_COOKIE, InvalidAuthToken, SessionAccountsService, set_auth_cookie,
                      get_auth_session, create_access_token, password_reset_user, registration_claims, set_registration_cookie,
                      clear_registration_cookie, create_registration_token, revoke_user_access_tokens, set_password_reset_cookie,
                      clear_password_reset_cookie, create_password_reset_token)
from src.utils import mail, urls, passwords
from threading import Lock
from sqlalchemy import func
from urllib.parse import urlencode
from sqlalchemy.exc import IntegrityError
from src.models.auth import (PasswordLogin, RegistrationRequest, PasswordResetRequest, RegistrationComplete, RegistrationVerified,
                             PasswordResetComplete, RegistrationTokenConfirm, PasswordResetTokenConfirm)
from src.environments import env
from src.models.roles import PlatformRoles
from src.models.users import UserProfile
from src.database.services import invitations
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User

router = APIRouter()
PASSWORD_RESET_THROTTLE_WINDOW_SECONDS = 900.0
PASSWORD_RESET_IP_LIMIT = 10
PASSWORD_RESET_EMAIL_LIMIT = 3
PASSWORD_RESET_THROTTLE_MAX_KEYS = 10_000
password_reset_attempts: dict[tuple[str, str], tuple[float, int]] = {}
password_reset_attempts_lock = Lock()


def allow_password_reset_request(client_ip: str, email: str) -> bool:
    """Apply fixed-window in-process limits to one client IP and normalized email."""

    now = time.monotonic()
    keys = ((("ip", client_ip), PASSWORD_RESET_IP_LIMIT), (("email", email), PASSWORD_RESET_EMAIL_LIMIT))

    # Check both dimensions before recording an accepted attempt.
    with password_reset_attempts_lock:
        current: dict[tuple[str, str], tuple[float, int]] = {}
        for key, limit in keys:
            started_at, count = password_reset_attempts.get(key, (now, 0))
            if now - started_at >= PASSWORD_RESET_THROTTLE_WINDOW_SECONDS:
                started_at, count = now, 0
            if count >= limit:
                return False
            current[key] = (started_at, count)

        # Bound process memory while retaining active windows whenever practical.
        if len(password_reset_attempts) >= PASSWORD_RESET_THROTTLE_MAX_KEYS:
            expired = [
                key
                for key, (started_at, _) in password_reset_attempts.items()
                if now - started_at >= PASSWORD_RESET_THROTTLE_WINDOW_SECONDS
            ]
            for key in expired:
                password_reset_attempts.pop(key, None)
            while len(password_reset_attempts) >= PASSWORD_RESET_THROTTLE_MAX_KEYS:
                password_reset_attempts.pop(next(iter(password_reset_attempts)))

        # Count accepted requests against both the source and destination limits.
        for key, (started_at, count) in current.items():
            password_reset_attempts[key] = (started_at, count + 1)
    return True


@router.post("/api/auth/password/login", status_code=204, tags=["auth"])
async def password_login(
    payload: PasswordLogin,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_auth_session),
):
    """Authenticate a local account and create one revocable browser session."""

    normalized_email = str(payload.email).strip().lower()

    # Load the case-insensitive account identity before verifying its credential.
    statement = select(User).where(func.lower(col(User.email)) == normalized_email)
    user = (await session.execute(statement)).scalar_one_or_none()
    if user is None:
        passwords.hash(payload.password)
        raise HTTPException(status_code=400, detail="LOGIN_BAD_CREDENTIALS")

    # Verify the supplied password and upgrade a successful legacy hash in the same transaction.
    verified, updated_hash = passwords.verify(payload.password, user.hashed_password)
    if not verified or user.deleted_at is not None:
        raise HTTPException(status_code=400, detail="LOGIN_BAD_CREDENTIALS")
    if updated_hash is not None:
        user.hashed_password = updated_hash

    # Issue the session and accept email-bound Organization access atomically.
    token = create_access_token(session, user)
    await invitations.accept_in_session(session, user)
    await session.commit()

    # Publish authentication only after all persistent login effects commit.
    response.headers["Cache-Control"] = "no-store"
    set_auth_cookie(response, token)
    SessionAccountsService(request).remember(user.id)


@router.post("/api/auth/forgot-password", status_code=202, response_model=None, tags=["auth"])
async def request_password_reset(
    payload: PasswordResetRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_auth_session),
):
    """Queue password reset delivery without disclosing account existence."""

    normalized_email = str(payload.email).strip().lower()
    client_ip = request.client.host if request.client is not None else "unknown"

    # Throttled requests receive the same accepted response without a database lookup or email.
    if not allow_password_reset_request(client_ip, normalized_email):
        return

    # Missing and inactive accounts receive the same response as eligible accounts.
    statement = select(User).where(func.lower(col(User.email)) == normalized_email, col(User.deleted_at).is_(None))
    user = (await session.execute(statement)).scalar_one_or_none()
    if user is None:
        return

    # Generate signed proof and perform SMTP delivery only after the response has been sent.
    next_path = urls.safe_local_path(payload.next, "/organizations")
    query = urlencode({"next": next_path})
    fragment = urlencode({"token": create_password_reset_token(user)})
    url = f"{env.PUBLIC_URL.rstrip('/')}/auth/reset-password?{query}#{fragment}"
    email = user.email
    await session.rollback()
    background_tasks.add_task(
        mail.send_authentication_email,
        email,
        "Reset your LongLink password",
        f"Reset your password:\n\n{url}\n",
    )


@router.post("/api/auth/reset-password/verify", status_code=204, tags=["auth"])
async def verify_password_reset_token(
    payload: PasswordResetTokenConfirm,
    response: Response,
    session: AsyncSession = Depends(get_auth_session),
):
    """Exchange an emailed reset bearer token for browser-only proof."""

    # Validate the bearer credential before moving it into a restricted cookie.
    try:
        await password_reset_user(session, payload.token)
    except InvalidAuthToken as exc:
        raise HTTPException(status_code=400, detail="RESET_PASSWORD_BAD_TOKEN") from exc
    response.headers["Cache-Control"] = "no-store"
    set_password_reset_cookie(response, payload.token)


@router.get("/api/auth/reset-password/setup", status_code=204, tags=["auth"])
async def get_password_reset_setup(
    response: Response,
    password_reset_token: str | None = Cookie(default=None, alias=PASSWORD_RESET_COOKIE),
    session: AsyncSession = Depends(get_auth_session),
):
    """Restore password reset state from browser-only proof."""

    # Refreshes validate only the restricted cookie, never an exposed URL credential.
    try:
        await password_reset_user(session, password_reset_token or "")
    except InvalidAuthToken as exc:
        raise HTTPException(status_code=400, detail="RESET_PASSWORD_BAD_TOKEN") from exc
    response.headers["Cache-Control"] = "no-store"


@router.post("/api/auth/reset-password", status_code=204, tags=["auth"])
async def reset_password(
    payload: PasswordResetComplete,
    response: Response,
    password_reset_token: str | None = Cookie(default=None, alias=PASSWORD_RESET_COOKIE),
    session: AsyncSession = Depends(get_auth_session),
):
    """Replace a password using browser-only reset proof."""

    # Resolve the active account from one valid, current password-reset credential.
    try:
        user = await password_reset_user(session, password_reset_token or "")
    except InvalidAuthToken as exc:
        raise HTTPException(status_code=400, detail="RESET_PASSWORD_BAD_TOKEN") from exc

    # Replace the credential and revoke every existing browser session atomically.
    user.hashed_password = passwords.hash(payload.password)
    await revoke_user_access_tokens(session, user.id)
    await session.commit()

    # Remove reset proof only after the password and session revocation both commit.
    response.headers["Cache-Control"] = "no-store"
    clear_password_reset_cookie(response)


@router.post("/api/auth/register", status_code=202, tags=["auth"])
async def request_registration(
    payload: RegistrationRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_auth_session),
):
    """Send a stateless registration link when the email has no account."""

    normalized_email = str(payload.email).lower()

    # Keep the response non-enumerating while avoiding registration mail for existing accounts.
    statement = select(User.id).where(func.lower(col(User.email)) == normalized_email)
    if (await session.execute(statement)).scalar_one_or_none() is not None:
        return

    # End the read transaction before asynchronous mail delivery starts.
    await session.rollback()

    # Email proof contains no password or pending user identifier.
    next_path = urls.safe_local_path(payload.next, "/organizations")
    token = create_registration_token(normalized_email, next_path)
    background_tasks.add_task(mail.send_signup_verification_email, normalized_email, token)


@router.post("/api/auth/verify", response_model=RegistrationVerified, tags=["auth"])
async def verify_registration_token(payload: RegistrationTokenConfirm, response: Response):
    """Validate an emailed registration token without creating an account."""

    # Convert invalid and expired tokens into one stable authentication error.
    try:
        claims = registration_claims(payload.token)
    except InvalidAuthToken as exc:
        raise HTTPException(status_code=400, detail="VERIFY_USER_BAD_TOKEN") from exc
    response.headers["Cache-Control"] = "no-store"
    set_registration_cookie(response, payload.token)
    return {"email": claims.email, "next": claims.next_path}


@router.get("/api/auth/register/setup", response_model=RegistrationVerified, tags=["auth"])
async def get_registration_setup(
    response: Response,
    registration_token: str | None = Cookie(default=None, alias=REGISTRATION_COOKIE),
):
    """Restore verified registration state from its browser-only cookie."""

    # Refreshes never need the emailed credential after its initial exchange.
    try:
        claims = registration_claims(registration_token or "")
    except InvalidAuthToken as exc:
        raise HTTPException(status_code=400, detail="VERIFY_USER_BAD_TOKEN") from exc
    response.headers["Cache-Control"] = "no-store"
    return {"email": claims.email, "next": claims.next_path}


@router.post("/api/auth/register/complete", response_model=UserProfile, status_code=201, tags=["auth"])
async def complete_registration(
    payload: RegistrationComplete,
    request: Request,
    response: Response,
    registration_token: str | None = Cookie(default=None, alias=REGISTRATION_COOKIE),
    session: AsyncSession = Depends(get_auth_session),
):
    """Create and authenticate an account after stateless email verification."""

    # Bind account creation to the signed email rather than any client-supplied identity.
    try:
        claims = registration_claims(registration_token or "")
    except InvalidAuthToken as exc:
        raise HTTPException(status_code=400, detail="VERIFY_USER_BAD_TOKEN") from exc
    email = claims.email

    # Prevent another browser tab's setup cookie from changing the displayed account identity.
    if str(payload.email).lower() != email:
        raise HTTPException(status_code=400, detail="REGISTER_SETUP_MISMATCH")

    # Reject token replay and concurrent account creation before expensive password hashing.
    statement = select(User.id).where(func.lower(col(User.email)) == email)
    if (await session.execute(statement)).scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="REGISTER_USER_ALREADY_EXISTS")

    # Build the authenticated account and its first revocable session in one transaction.
    is_initial_admin = env.INITIAL_ADMIN_EMAIL is not None and email == env.INITIAL_ADMIN_EMAIL.lower()
    user = User(
        name=f"{payload.name} {payload.surname}",
        email=email,
        hashed_password=passwords.hash(payload.password),
        role=PlatformRoles.administrator if is_initial_admin else PlatformRoles.user,
    )
    session.add(user)

    # Persist the user before its FK-dependent token and treat uniqueness races uniformly.
    try:
        await session.flush()
        await invitations.accept_in_session(session, user)
        token = create_access_token(session, user)
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=400, detail="REGISTER_USER_ALREADY_EXISTS") from exc

    # Publish browser authentication only after both persistent records commit.
    response.headers["Cache-Control"] = "no-store"
    set_auth_cookie(response, token)
    clear_registration_cookie(response)
    SessionAccountsService(request).remember(user.id)
    return user
