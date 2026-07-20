from fastapi import APIRouter
from src.auth import fastapi_users, cookie_backend, oidc_oauth_client, github_oauth_client, oauth_cookie_backend
from src.models.auth import AuthUser, AuthConfig, AuthUserCreate
from src.environments import env

router = APIRouter()


@router.get("/auth/config", response_model=AuthConfig, include_in_schema=False)
async def get_auth_config():
    """Return public authentication capabilities for the login UI."""

    return {
        "registration_enabled": env.registration(),
        "github_enabled": github_oauth_client is not None,
        "oidc_enabled": oidc_oauth_client is not None,
    }


# Register the local password and account-recovery flows.
router.include_router(
    fastapi_users.get_auth_router(cookie_backend, requires_verification=True),
    prefix="/auth/password",
    tags=["auth"],
)
if env.registration():
    router.include_router(
        fastapi_users.get_register_router(AuthUser, AuthUserCreate),
        prefix="/auth",
        tags=["auth"],
    )
router.include_router(fastapi_users.get_verify_router(AuthUser), prefix="/auth", tags=["auth"])
router.include_router(fastapi_users.get_reset_password_router(), prefix="/auth", tags=["auth"])

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
if oidc_oauth_client is not None:
    router.include_router(
        fastapi_users.get_oauth_router(
            oidc_oauth_client,
            oauth_cookie_backend,
            env.SESSION_KEY,
            associate_by_email=False,
            is_verified_by_default=env.OIDC_EMAIL_VERIFIED,
            csrf_token_cookie_secure=not env.DEVELOPMENT,
        ),
        prefix="/auth/oidc",
        tags=["auth"],
    )
