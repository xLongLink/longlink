from fastapi import APIRouter, Request
from src.auth import SessionAccountsService
from src.errors import NotFoundError
from src.models.common import SuccessResponse
from src.models.users import UserListItem
from src.database.services.users import users


router = APIRouter()


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


@router.get("/auth/accounts", response_model=list[UserListItem], include_in_schema=False)
async def list_accounts(request: Request) -> list[UserListItem]:
    """Return the saved session accounts for the login screen."""

    accounts: list[UserListItem] = []
    for oidc in SessionAccountsService(request).list():
        user = await users.get(oidc)
        if user is None:
            continue

        accounts.append(UserListItem.model_validate(user))

    return accounts
