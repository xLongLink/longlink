import pytest
from uuid import uuid4
from typing import cast
from fastapi import Request
from src.auth import UserManager, LongLinkUserDatabase, SessionAccountsService, access_token_digest
from fastapi_users import schemas
from fastapi_users.exceptions import InvalidPasswordException

pytestmark = pytest.mark.no_db


def test_access_token_digest_is_deterministic_and_hides_raw_token() -> None:
    """Hash browser tokens before persistence."""

    # Act
    first = access_token_digest("browser-token")
    repeated = access_token_digest("browser-token")
    other = access_token_digest("other-token")

    # Assert
    assert first == repeated
    assert first != other
    assert first != "browser-token"
    assert len(first) == 64


def test_session_accounts_filters_invalid_and_duplicate_ids() -> None:
    """Return only unique UUIDs from signed saved-account state."""

    first_id = uuid4()
    second_id = uuid4()
    request = Request(
        {
            "type": "http",
            "session": {"account_ids": [str(first_id), "invalid", str(first_id), None, str(second_id)]},
        }
    )

    # Parse untrusted session values without leaking malformed identifiers.
    accounts = SessionAccountsService(request).list()

    assert accounts == [first_id, second_id]


def test_session_accounts_remember_and_remove_local_users() -> None:
    """Keep recent local accounts ordered and remove only the selected user."""

    account_ids = [uuid4() for _ in range(10)]
    request = Request(
        {
            "type": "http",
            "session": {"account_ids": [str(account_id) for account_id in account_ids]},
        }
    )
    accounts = SessionAccountsService(request)

    # Move an existing account to the most-recent position, then remove it.
    accounts.remember(account_ids[0])
    assert request.session["account_ids"] == [str(account_id) for account_id in [*account_ids[1:], account_ids[0]]]

    accounts.remove(account_ids[0])
    assert accounts.list() == account_ids[1:]


async def test_user_manager_requires_configured_password_bounds() -> None:
    """Reject local passwords outside the configured length bounds."""

    manager = UserManager(cast(LongLinkUserDatabase, None))
    user = schemas.BaseUserCreate(email="user@example.com", password="unused-password")

    # Enforce the LongLink password policy before FastAPI Users persists credentials.
    with pytest.raises(InvalidPasswordException) as short_password:
        await manager.validate_password("too-short", user)
    with pytest.raises(InvalidPasswordException) as long_password:
        await manager.validate_password("x" * 1025, user)

    assert short_password.value.reason == "Password must contain at least 12 characters"
    assert long_password.value.reason == "Password cannot exceed 1024 characters"
    await manager.validate_password("twelve-chars", user)
