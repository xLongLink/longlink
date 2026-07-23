import time
import secrets
from fastapi import Cookie, Depends, Request, Response, APIRouter, HTTPException, BackgroundTasks
from sqlmodel import col, select
from src.auth import (REGISTRATION_COOKIE, PASSWORD_RESET_COOKIE, UserManager, SessionAccountsService, fastapi_users, cookie_backend,
                      cookie_transport, get_auth_session, get_user_manager, access_token_digest, github_oauth_client, registration_claims,
                      oauth_cookie_backend, set_registration_cookie, clear_registration_cookie, create_registration_token,
                      set_password_reset_cookie, clear_password_reset_cookie)
from src.utils import mail, urls
from threading import Lock
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from src.models.auth import (AuthConfig, RegistrationRequest, PasswordResetRequest, RegistrationComplete, RegistrationVerified,
                             PasswordResetComplete, RegistrationTokenConfirm, PasswordResetTokenConfirm)
from src.environments import env
from src.models.roles import PlatformRoles
from src.models.users import UserProfile
from src.database.services import invitations
from fastapi_users.password import PasswordHelper
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi_users.exceptions import UserInactive, UserNotExists, InvalidVerifyToken, InvalidPasswordException, InvalidResetPasswordToken
from src.database.models.users import User, AccessToken

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


@router.get("/api/auth/config", response_model=AuthConfig, include_in_schema=False)
async def get_auth_config():
    """Return public authentication capabilities for the login UI."""

    return {
        "github_enabled": github_oauth_client is not None,
    }


# Register local password login without pending-user verification state.
router.include_router(fastapi_users.get_auth_router(cookie_backend), prefix="/api/auth/password", tags=["auth"])


@router.post("/api/auth/forgot-password", status_code=202, response_model=None, tags=["auth"])
async def request_password_reset(
    payload: PasswordResetRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    user_manager: UserManager = Depends(get_user_manager),
):
    """Queue password reset delivery without disclosing account existence."""

    normalized_email = str(payload.email).strip().lower()
    client_ip = request.client.host if request.client is not None else "unknown"

    # Throttled requests receive the same accepted response without a database lookup or email.
    if not allow_password_reset_request(client_ip, normalized_email):
        return

    # Missing and inactive accounts receive the same response as eligible accounts.
    try:
        user = await user_manager.get_by_email(normalized_email)
    except UserNotExists:
        return
    if not user.is_active:
        return

    # Generate the token and perform SMTP delivery only after the response has been sent.
    request.state.password_reset_next = urls.safe_local_path(payload.next, "/organizations")
    background_tasks.add_task(user_manager.forgot_password, user, request)


@router.post("/api/auth/reset-password/verify", status_code=204, tags=["auth"])
async def verify_password_reset_token(
    payload: PasswordResetTokenConfirm,
    response: Response,
    user_manager: UserManager = Depends(get_user_manager),
):
    """Exchange an emailed reset bearer token for browser-only proof."""

    # Validate the bearer credential before moving it into a restricted cookie.
    try:
        await user_manager.validate_reset_password_token(payload.token)
    except (InvalidResetPasswordToken, UserNotExists, UserInactive) as exc:
        raise HTTPException(status_code=400, detail="RESET_PASSWORD_BAD_TOKEN") from exc
    response.headers["Cache-Control"] = "no-store"
    set_password_reset_cookie(response, payload.token)


@router.get("/api/auth/reset-password/setup", status_code=204, tags=["auth"])
async def get_password_reset_setup(
    response: Response,
    password_reset_token: str | None = Cookie(default=None, alias=PASSWORD_RESET_COOKIE),
    user_manager: UserManager = Depends(get_user_manager),
):
    """Restore password reset state from browser-only proof."""

    # Refreshes validate only the restricted cookie, never an exposed URL credential.
    try:
        await user_manager.validate_reset_password_token(password_reset_token or "")
    except (InvalidResetPasswordToken, UserNotExists, UserInactive) as exc:
        raise HTTPException(status_code=400, detail="RESET_PASSWORD_BAD_TOKEN") from exc
    response.headers["Cache-Control"] = "no-store"


@router.post("/api/auth/reset-password", status_code=204, tags=["auth"])
async def reset_password(
    payload: PasswordResetComplete,
    request: Request,
    response: Response,
    password_reset_token: str | None = Cookie(default=None, alias=PASSWORD_RESET_COOKIE),
    user_manager: UserManager = Depends(get_user_manager),
):
    """Replace a password using browser-only reset proof."""

    # Preserve FastAPI Users' stable reset-token and password-policy errors.
    try:
        await user_manager.reset_password(password_reset_token or "", payload.password, request)
    except (InvalidResetPasswordToken, UserNotExists, UserInactive) as exc:
        raise HTTPException(status_code=400, detail="RESET_PASSWORD_BAD_TOKEN") from exc
    except InvalidPasswordException as exc:
        raise HTTPException(
            status_code=400,
            detail={"code": "RESET_PASSWORD_INVALID_PASSWORD", "reason": exc.reason},
        ) from exc

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
    except InvalidVerifyToken as exc:
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
    except InvalidVerifyToken as exc:
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
    except InvalidVerifyToken as exc:
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
        hashed_password=PasswordHelper().hash(payload.password),
        is_superuser=is_initial_admin,
        role=PlatformRoles.administrator if is_initial_admin else PlatformRoles.user,
    )
    token = secrets.token_urlsafe()
    session.add(user)

    # Persist the user before its FK-dependent token and treat uniqueness races uniformly.
    try:
        await session.flush()
        await invitations.accept_in_session(session, user)
        session.add(AccessToken(token=access_token_digest(token), user_id=user.id))
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=400, detail="REGISTER_USER_ALREADY_EXISTS") from exc
    await session.refresh(user)

    # Publish browser authentication only after both persistent records commit.
    response.headers["Cache-Control"] = "no-store"
    cookie_transport._set_login_cookie(response, token)
    clear_registration_cookie(response)
    SessionAccountsService(request).remember(user.id)
    return user


# Register optional OAuth providers only when complete credentials are available.
if github_oauth_client is not None:
    router.include_router(
        fastapi_users.get_oauth_router(
            github_oauth_client,
            oauth_cookie_backend,
            env.SESSION_KEY,
            associate_by_email=False,
            csrf_token_cookie_secure=not env.DEVELOPMENT,
        ),
        prefix="/api/auth/github",
        tags=["auth"],
    )
