from fastapi import Request, APIRouter, HTTPException
from src.auth import SessionAccountsService
from src.models.users import UserListItem
from src.models.common import SuccessResponse
from src.database.services import users
from src.database.models.users import User

router = APIRouter()


@router.post("/auth/accounts/{oidc}/activate", response_model=SuccessResponse, include_in_schema=False)
async def activate_account(oidc: str, request: Request):
    """Switch the active account within the current browser session."""

    session_accounts = SessionAccountsService(request)

    # Only activate accounts saved in this session.
    if oidc not in session_accounts.list():
        raise HTTPException(status_code=403, detail="Account is not saved in this session")

    # Require the saved account to still exist.
    if await users.get(oidc) is None:
        raise HTTPException(status_code=404, detail="Account not found")

    session_accounts.activate(oidc)
    return {}


@router.post("/auth/accounts/deactivate", response_model=list[UserListItem], include_in_schema=False)
async def deactivate_account(request: Request):
    """Clear the active account without removing saved accounts."""

    SessionAccountsService(request).deactivate()
    
    return await list_accounts(request)


@router.get("/auth/accounts", response_model=list[UserListItem], include_in_schema=False)
async def list_accounts(request: Request):
    """Return the saved session accounts for the login screen."""

    accounts: list[User] = []

    # Load each saved session account.
    for oidc in SessionAccountsService(request).list():
        # Skip stale session account references.
        user = await users.get(oidc)
        if user is None:
            continue

        accounts.append(user)

    return accounts
