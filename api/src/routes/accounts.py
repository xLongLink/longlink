from fastapi import Depends, Request, Response, APIRouter
from src.auth import SessionAccountsService, get_auth_session, current_optional_user_token
from src.utils import token
from src.environments import env
from src.models.users import UserSummary
from src.database.services import users
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User

router = APIRouter()


@router.post("/api/auth/accounts/deactivate", response_model=list[UserSummary], include_in_schema=False)
async def deactivate_account(
    request: Request,
    response: Response,
    authentication: tuple[User | None, str | None] = Depends(current_optional_user_token),
    session: AsyncSession = Depends(get_auth_session),
):
    """Clear the active account while retaining saved browser accounts."""

    current_user, current_token = authentication

    # Revoke the active database token when one is present.
    if current_user is not None and current_token is not None:
        await token.revoke_access_token(session, current_token)
        await session.commit()

    accounts: list[User] = []

    # Load saved accounts and skip stale session references.
    for user_id in SessionAccountsService(request).list():
        user = await users.get(user_id)
        if user is not None:
            accounts.append(user)

    # Match the session-cookie scope so browsers reliably remove the credential.
    response.delete_cookie(
        "longlink_auth",
        path="/",
        secure=not env.DEVELOPMENT,
        httponly=True,
        samesite="lax",
    )
    return accounts


@router.get("/api/auth/accounts", response_model=list[UserSummary], include_in_schema=False)
async def list_accounts(request: Request):
    """Return accounts previously authenticated in this browser session."""

    accounts: list[User] = []

    # Load each saved account while ignoring stale references.
    for user_id in SessionAccountsService(request).list():
        user = await users.get(user_id)
        if user is not None:
            accounts.append(user)
    return accounts


@router.post("/api/auth/logout", status_code=204, include_in_schema=False)
async def logout(
    request: Request,
    authentication: tuple[User | None, str | None] = Depends(current_optional_user_token),
    session: AsyncSession = Depends(get_auth_session),
) -> Response:
    """Revoke the active token and remove that account from the switcher."""

    user, credential = authentication

    # Remove only the active account while preserving other saved accounts.
    if user is not None:
        SessionAccountsService(request).remove(user.id)
    if credential is not None:
        await token.revoke_access_token(session, credential)
        await session.commit()

    # Return a response that removes the browser credential at its original scope.
    response = Response(status_code=204)
    response.delete_cookie(
        "longlink_auth",
        path="/",
        secure=not env.DEVELOPMENT,
        httponly=True,
        samesite="lax",
    )
    return response
