import httpx2
from typing import Any, Final, Literal, cast
from fastapi import Query, Request, Response, APIRouter
from pydantic import Field, BaseModel, ValidationError
from src.auth import SessionAccountsService, oauth
from src.errors import UnavailableError, UnauthorizedError
from src.models.auth import OidcUserInfo, OidcTokenResponse
from src.environments import env
from fastapi.responses import RedirectResponse
from src.models.common import SuccessResponse
from src.database.services.users import users

router = APIRouter()
DEFAULT_POST_LOGIN_REDIRECT: Final[str] = "/organizations"
OIDC_NEXT_SESSION_KEY: Final[str] = "oidc_next"


def _sanitize_next_path(next_path: str | None) -> str:
    """Keep only safe relative post-login paths."""

    if next_path is None:
        return DEFAULT_POST_LOGIN_REDIRECT

    if not next_path.startswith("/") or next_path.startswith("//"):
        return DEFAULT_POST_LOGIN_REDIRECT

    return next_path


class PasswordLoginRequest(BaseModel):
    """Payload for the password-based login flow."""

    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


async def upsert_oidc_user(userinfo: OidcUserInfo) -> str:
    """Normalize provider profile claims into the local user record."""

    email = userinfo.email
    if not email:
        raise UnavailableError("Authentication provider returned no email")

    name = userinfo.name or userinfo.preferred_username
    if not name:
        given_name = userinfo.given_name
        family_name = userinfo.family_name
        if not given_name or not family_name:
            raise UnavailableError("Authentication provider returned no display name")

        name = f"{given_name} {family_name}"

    await users.upsert(
        oidc=userinfo.sub,
        email=str(email),
        name=name,
        avatar=userinfo.picture,
    )
    return userinfo.sub


@router.get("/auth/login/oidc", include_in_schema=False)
async def login_oidc(
    request: Request,
    provider: Literal["github", "google"] | None = None,
    next_path: str | None = Query(default=None, alias="next"),
) -> Response:
    """Initiate OIDC login flow by redirecting to the identity provider."""

    oidc = cast(Any, oauth).create_client("oidc")

    request.session[OIDC_NEXT_SESSION_KEY] = _sanitize_next_path(next_path)
    authorize_kwargs: dict[str, Any] = {}

    if provider is not None:
        authorize_kwargs["kc_idp_hint"] = provider

    try:
        return cast(
            Response,
            await oidc.authorize_redirect(
                request,
                redirect_uri=env.OIDC_REDIRECT_URI,
                **authorize_kwargs,
            ),
        )
    except httpx2.HTTPStatusError as exc:
        raise UnavailableError(
            "OIDC provider metadata is unavailable. Check OIDC_ISSUER and provider realm configuration."
        ) from exc


@router.post("/auth/login/password", include_in_schema=False)
async def login_password(request: Request, payload: PasswordLoginRequest) -> Response:
    """Exchange username/password credentials for a session through Keycloak."""

    # Fetch the provider metadata first so the token and userinfo URLs come from discovery.
    metadata_url = f"{env.OIDC_ISSUER.rstrip('/')}/.well-known/openid-configuration"

    async with httpx2.AsyncClient() as client:
        try:
            metadata_response = await client.get(metadata_url)
            metadata_response.raise_for_status()
        except (httpx2.HTTPStatusError, httpx2.RequestError) as exc:
            raise UnavailableError("Authentication provider unavailable") from exc

        metadata = metadata_response.json()

        # Exchange the provided credentials for an access token.
        token_response = await client.post(
            metadata["token_endpoint"],
            data={
                "grant_type": "password",
                "client_id": env.OIDC_CLIENT_ID,
                "client_secret": env.OIDC_CLIENT_SECRET,
                "username": payload.username,
                "password": payload.password,
                "scope": "openid profile email",
            },
        )

    try:
        token_response.raise_for_status()
    except httpx2.HTTPStatusError as exc:
        if exc.response.status_code in {400, 401}:
            raise UnauthorizedError("Invalid username or password") from exc

        raise UnavailableError("Authentication provider unavailable") from exc

    try:
        token = OidcTokenResponse.model_validate(token_response.json())
    except ValidationError as exc:
        raise UnavailableError("Authentication provider returned an invalid token payload") from exc

    if not token.access_token:
        raise UnavailableError("Authentication provider returned no access token")

    # Use the access token to fetch the authenticated user's profile.
    async with httpx2.AsyncClient() as client:
        try:
            userinfo_response = await client.get(
                metadata["userinfo_endpoint"],
                headers={"Authorization": f"Bearer {token.access_token}"},
            )
            userinfo_response.raise_for_status()
        except (httpx2.HTTPStatusError, httpx2.RequestError) as exc:
            raise UnavailableError("Failed to read authenticated user profile") from exc

    try:
        userinfo = OidcUserInfo.model_validate(userinfo_response.json())
    except ValidationError as exc:
        raise UnavailableError("Authentication provider returned an invalid user profile") from exc

    subject = await upsert_oidc_user(userinfo)
    SessionAccountsService(request).activate(subject)
    return Response(status_code=204)


@router.get("/auth/oidc", include_in_schema=False)
async def auth_oidc(request: Request) -> RedirectResponse:
    """Handle OIDC callback, exchange code for token, and create/update user."""

    oidc = cast(Any, oauth).create_client("oidc")

    try:
        token: Any = await oidc.authorize_access_token(request)
    except httpx2.HTTPStatusError as exc:
        raise UnavailableError("OIDC token exchange failed. Verify provider URL and client credentials.") from exc

    raw_userinfo: Any = getattr(token, "userinfo", None)
    # Fall back to the userinfo endpoint when the token payload does not include profile claims.
    if raw_userinfo is None:
        try:
            raw_userinfo = await oidc.userinfo(token=token.model_dump(mode="python"))
        except ValidationError as exc:
            raise UnavailableError("Authentication provider returned an invalid user profile") from exc

    try:
        userinfo = OidcUserInfo.model_validate(raw_userinfo)
    except ValidationError as exc:
        raise UnavailableError("Authentication provider returned an invalid user profile") from exc

    subject = await upsert_oidc_user(userinfo)
    SessionAccountsService(request).activate(subject)
    next_path = request.session.pop(OIDC_NEXT_SESSION_KEY, DEFAULT_POST_LOGIN_REDIRECT)
    return RedirectResponse(_sanitize_next_path(next_path))


@router.get("/auth/logout", response_model=SuccessResponse, include_in_schema=False)
async def logout(request: Request) -> SuccessResponse:
    """Clear the user session and log out."""

    SessionAccountsService(request).remove()
    return SuccessResponse()
