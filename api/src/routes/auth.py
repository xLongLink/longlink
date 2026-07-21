from uuid import UUID
from fastapi import Depends, Request, Response, APIRouter, HTTPException
from src.auth import (UserManager, SessionAccountsService, fastapi_users, cookie_backend, get_user_manager, github_oauth_client,
                      oauth_cookie_backend, get_database_strategy)
from src.models.auth import AuthUser, AuthConfig, AuthUserCreate, VerificationRequest, VerificationTokenConfirm
from src.environments import env
from fastapi_users.exceptions import UserInactive, UserNotExists, InvalidVerifyToken, UserAlreadyVerified
from src.database.models.users import User, AccessToken
from fastapi_users.authentication.strategy.db import DatabaseStrategy

router = APIRouter()


@router.get("/api/auth/config", response_model=AuthConfig, include_in_schema=False)
async def get_auth_config():
    """Return public authentication capabilities for the login UI."""

    return {
        "github_enabled": github_oauth_client is not None,
    }


# Register the local password and account-recovery flows.
router.include_router(
    fastapi_users.get_auth_router(cookie_backend, requires_verification=True),
    prefix="/api/auth/password",
    tags=["auth"],
)
router.include_router(
    fastapi_users.get_register_router(AuthUser, AuthUserCreate),
    prefix="/api/auth",
    tags=["auth"],
)
router.include_router(fastapi_users.get_reset_password_router(), prefix="/api/auth", tags=["auth"])


@router.post("/api/auth/request-verify-token", status_code=202, tags=["auth"])
async def request_verification_link(
    payload: VerificationRequest,
    request: Request,
    user_manager: UserManager = Depends(get_user_manager),
):
    """Send a fresh email verification link when the account can be verified."""

    # Match FastAPI Users' non-enumerating behavior for missing, inactive, and already verified accounts.
    try:
        user = await user_manager.get_by_email(payload.email)
        await user_manager.request_verify(user, request)
    except (UserNotExists, UserInactive, UserAlreadyVerified):
        pass


@router.post("/api/auth/verify", response_model=AuthUser, tags=["auth"])
async def verify_email_token(
    payload: VerificationTokenConfirm,
    request: Request,
    response: Response,
    user_manager: UserManager = Depends(get_user_manager),
    strategy: DatabaseStrategy[User, UUID, AccessToken] = Depends(get_database_strategy),
):
    """Confirm an emailed verification token and create a platform session."""

    # Convert invalid and expired tokens into stable authentication API errors.
    try:
        user = await user_manager.verify_email_token(payload.token, request)
    except (InvalidVerifyToken, UserNotExists) as exc:
        raise HTTPException(status_code=400, detail="VERIFY_USER_BAD_TOKEN") from exc

    # Copy the authentication cookie from the normal backend login response onto this JSON response.
    login_response = await cookie_backend.login(strategy, user)
    for name, value in login_response.raw_headers:
        if name.lower() == b"set-cookie":
            response.raw_headers.append((name, value))
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
            is_verified_by_default=True,
            csrf_token_cookie_secure=not env.DEVELOPMENT,
        ),
        prefix="/api/auth/github",
        tags=["auth"],
    )
