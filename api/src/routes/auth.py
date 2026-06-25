import httpx2
from typing import cast
from fastapi import Request, APIRouter, Response
from pydantic import Field, BaseModel, ValidationError
from src.auth import (
    SessionAccountsService,
    oauth,
)
from src.errors import NotFoundError, UnavailableError, UnauthorizedError
from src.models.auth import OidcUserInfo, OidcTokenResponse
from src.environments import env
from fastapi.responses import RedirectResponse
from src.models.common import SuccessResponse
from src.models.users import UserListItem
from src.database.services.users import users
from authlib.integrations.starlette_client.apps import StarletteOAuth2App


router = APIRouter()


class PasswordLoginRequest(BaseModel):
    """Payload for the password-based login flow."""

    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


@router.get("/auth/login/oidc", include_in_schema=False)
async def login_oidc(request: Request):
    """Initiate OIDC login flow by redirecting to the identity provider."""

    oidc = cast(StarletteOAuth2App, oauth.create_client("oidc"))

    try:
        return await oidc.authorize_redirect(request, redirect_uri=env.OIDC_REDIRECT_URI)
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

    # Normalize the provider payload into the local user record shape.
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

    SessionAccountsService(request).activate(userinfo.sub)
    return Response(status_code=204)


@router.get("/auth/oidc", include_in_schema=False)
async def auth_oidc(request: Request):
    """Handle OIDC callback, exchange code for token, and create/update user."""

    oidc = cast(StarletteOAuth2App, oauth.create_client("oidc"))

    try:
        token = await oidc.authorize_access_token(request)
    except httpx2.HTTPStatusError as exc:
        raise UnavailableError("OIDC token exchange failed. Verify provider URL and client credentials.") from exc

    userinfo = getattr(token, "userinfo", None)
    # Fall back to the userinfo endpoint when the token payload does not include profile claims.
    if userinfo is None:
        try:
            userinfo = OidcUserInfo.model_validate(await oidc.userinfo(token=token.model_dump(mode="python")))
        except ValidationError as exc:
            raise UnavailableError("Authentication provider returned an invalid user profile") from exc

    # Normalize the provider payload into the local user record shape.
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

    SessionAccountsService(request).activate(userinfo.sub)
    return RedirectResponse("/organizations")


@router.post("/auth/accounts/{oidc}/activate", response_model=SuccessResponse, include_in_schema=False)
async def activate_account(oidc: str, request: Request) -> SuccessResponse:
    """Switch the active account within the current browser session."""

    if await users.get(oidc) is None:
        raise NotFoundError("Account", oidc)

    SessionAccountsService(request).activate(oidc)
    return SuccessResponse()


@router.post("/auth/accounts/deactivate", response_model=list[UserListItem], include_in_schema=False)
async def deactivate_account(request: Request) -> list[UserListItem]:
    """Clear the active account without removing saved accounts."""

    SessionAccountsService(request).deactivate()
    return await list_accounts(request)


@router.get("/accounts", response_model=list[UserListItem], include_in_schema=False)
async def list_accounts(request: Request) -> list[UserListItem]:
    """Return the saved session accounts for the login screen."""

    accounts: list[UserListItem] = []
    for oidc in SessionAccountsService(request).list():
        user = await users.get(oidc)
        if user is None:
            continue

        accounts.append(UserListItem.model_validate(user))

    return accounts


@router.get("/auth/logout", response_model=SuccessResponse, include_in_schema=False)
async def logout(request: Request) -> SuccessResponse:
    """Clear the user session and log out."""

    SessionAccountsService(request).remove()
    return SuccessResponse()
