from uuid import UUID
from fastapi import Depends, Request, Response, APIRouter, HTTPException
from src.auth import SessionAccountsService, cookie_backend, cookie_transport, get_database_strategy, current_optional_user_token
from src.models.users import UserListItem
from src.database.services import users
from src.database.models.users import User, AccessToken
from fastapi_users.authentication.strategy.db import DatabaseStrategy

router = APIRouter()


@router.post("/api/auth/accounts/{user_id}/activate", status_code=204, include_in_schema=False)
async def activate_account(
    user_id: UUID,
    request: Request,
    authentication: tuple[User | None, str | None] = Depends(current_optional_user_token),
    strategy: DatabaseStrategy[User, UUID, AccessToken] = Depends(get_database_strategy),
):
    """Switch the active token to one account saved in this browser session."""

    session_accounts = SessionAccountsService(request)

    # Only activate accounts previously authenticated in this signed session.
    if user_id not in session_accounts.list():
        raise HTTPException(status_code=403, detail="Account is not saved in this session")

    user = await users.get(user_id)

    # Require the target account to remain active and verified.
    if user is None or not user.is_verified:
        raise HTTPException(status_code=404, detail="Account not found")

    current_user, current_token = authentication

    # Revoke the current token before issuing the target account token.
    if current_user is not None and current_token is not None:
        await strategy.destroy_token(current_token, current_user)
    return await cookie_backend.login(strategy, user)


@router.post("/api/auth/accounts/deactivate", response_model=list[UserListItem], include_in_schema=False)
async def deactivate_account(
    request: Request,
    response: Response,
    authentication: tuple[User | None, str | None] = Depends(current_optional_user_token),
    strategy: DatabaseStrategy[User, UUID, AccessToken] = Depends(get_database_strategy),
):
    """Clear the active account while retaining saved browser accounts."""

    current_user, current_token = authentication

    # Revoke the active database token when one is present.
    if current_user is not None and current_token is not None:
        await strategy.destroy_token(current_token, current_user)

    accounts: list[User] = []

    # Load active saved accounts and skip stale session references.
    for user_id in SessionAccountsService(request).list():
        user = await users.get(user_id)
        if user is not None and user.is_verified:
            accounts.append(user)

    cookie_transport._set_logout_cookie(response)
    return accounts


@router.get("/api/auth/accounts", response_model=list[UserListItem], include_in_schema=False)
async def list_accounts(request: Request):
    """Return accounts previously authenticated in this browser session."""

    accounts: list[User] = []

    # Load each saved account while ignoring stale references.
    for user_id in SessionAccountsService(request).list():
        user = await users.get(user_id)
        if user is not None and user.is_verified:
            accounts.append(user)
    return accounts


@router.post("/api/auth/logout", status_code=204, include_in_schema=False)
async def logout(
    request: Request,
    authentication: tuple[User | None, str | None] = Depends(current_optional_user_token),
    strategy: DatabaseStrategy[User, UUID, AccessToken] = Depends(get_database_strategy),
) -> Response:
    """Revoke the active token and remove that account from the switcher."""

    user, token = authentication

    # Remove only the active account while preserving other saved accounts.
    if user is not None:
        SessionAccountsService(request).remove(user.id)
    if user is not None and token is not None:
        return await cookie_backend.logout(strategy, user, token)
    return await cookie_transport.get_logout_response()
