from fastapi import Depends, Request, APIRouter, HTTPException
from src.auth import UserManager, get_user_manager, fastapi_users, cookie_backend, github_oauth_client, oauth_cookie_backend
from src.models.auth import AuthUser, AuthConfig, AuthUserCreate, VerificationCodeRequest, VerificationCodeConfirm
from src.environments import env
from fastapi_users.exceptions import InvalidVerifyToken, UserAlreadyVerified, UserInactive, UserNotExists

router = APIRouter()


@router.get("/auth/config", response_model=AuthConfig, include_in_schema=False)
async def get_auth_config():
    """Return public authentication capabilities for the login UI."""

    return {
        "github_enabled": github_oauth_client is not None,
    }


# Register the local password and account-recovery flows.
router.include_router(
    fastapi_users.get_auth_router(cookie_backend, requires_verification=True),
    prefix="/auth/password",
    tags=["auth"],
)
router.include_router(
    fastapi_users.get_register_router(AuthUser, AuthUserCreate),
    prefix="/auth",
    tags=["auth"],
)
router.include_router(fastapi_users.get_reset_password_router(), prefix="/auth", tags=["auth"])


@router.post("/auth/request-verify-token", status_code=202, tags=["auth"])
async def request_verification_code(
    payload: VerificationCodeRequest,
    request: Request,
    user_manager: UserManager = Depends(get_user_manager),
):
    """Send a fresh email verification code when the account can be verified."""

    # Match FastAPI Users' non-enumerating behavior for missing, inactive, and already verified accounts.
    try:
        user = await user_manager.get_by_email(payload.email)
        await user_manager.request_verify(user, request)
    except (UserNotExists, UserInactive, UserAlreadyVerified):
        pass


@router.post("/auth/verify", response_model=AuthUser, tags=["auth"])
async def verify_email_code(
    payload: VerificationCodeConfirm,
    request: Request,
    user_manager: UserManager = Depends(get_user_manager),
):
    """Confirm an emailed verification code and allow future platform access."""

    # Convert invalid, expired, and already-used codes into stable authentication API errors.
    try:
        return await user_manager.verify_code(payload.email, payload.code, request)
    except (InvalidVerifyToken, UserNotExists) as exc:
        raise HTTPException(status_code=400, detail="VERIFY_USER_BAD_CODE") from exc
    except UserAlreadyVerified as exc:
        raise HTTPException(status_code=400, detail="VERIFY_USER_ALREADY_VERIFIED") from exc

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
        prefix="/auth/github",
        tags=["auth"],
    )
