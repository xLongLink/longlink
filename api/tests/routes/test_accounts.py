from uuid import uuid4
from httpx2 import AsyncClient
from conftest import session_cookie, authenticated_cookies
from src.models.users import UserSummary
from src.database.models.users import User


async def test_list_accounts_returns_saved_local_accounts(client: AsyncClient, users: tuple[User, User, User]) -> None:
    """Return the local users retained by the signed browser session."""

    # Arrange
    saved_user, active_user, _ = users
    client.cookies.update(authenticated_cookies(active_user.id, [saved_user.id, active_user.id]))

    # Act
    response = await client.get("/api/auth/accounts")

    # Assert
    assert response.status_code == 200
    assert response.json() == [
        UserSummary.model_validate(saved_user).model_dump(mode="json"),
        UserSummary.model_validate(active_user).model_dump(mode="json"),
    ]


async def test_list_accounts_skips_stale_saved_users(client: AsyncClient, users: tuple[User, User, User]) -> None:
    """Return only persisted users from saved account session state."""

    # Arrange
    saved_user, _, _ = users
    client.cookies.update(session_cookie([saved_user.id, uuid4()]))

    # Act
    response = await client.get("/api/auth/accounts")

    # Assert
    assert response.status_code == 200
    assert response.json() == [UserSummary.model_validate(saved_user).model_dump(mode="json")]


async def test_deactivate_account_clears_only_the_auth_cookie(client: AsyncClient, users: tuple[User, User, User]) -> None:
    """Clear active authentication while retaining saved local accounts."""

    # Arrange
    active_user, saved_user, _ = users
    client.cookies.update(authenticated_cookies(active_user.id, [active_user.id, saved_user.id]))

    # Act
    response = await client.post("/api/auth/accounts/deactivate")

    # Assert
    assert response.status_code == 200
    assert response.json() == [
        UserSummary.model_validate(active_user).model_dump(mode="json"),
        UserSummary.model_validate(saved_user).model_dump(mode="json"),
    ]
    assert client.cookies.get("longlink_auth") is None
    accounts_response = await client.get("/api/auth/accounts")
    profile_response = await client.get("/api/me")
    assert accounts_response.status_code == 200
    assert accounts_response.json() == [
        UserSummary.model_validate(active_user).model_dump(mode="json"),
        UserSummary.model_validate(saved_user).model_dump(mode="json"),
    ]
    assert profile_response.status_code == 401


async def test_logout_clears_the_active_account(client: AsyncClient, users: tuple[User, User, User]) -> None:
    """Remove only the active account from the saved browser session."""

    # Arrange
    active_user, saved_user, _ = users
    client.cookies.update(authenticated_cookies(active_user.id, [active_user.id, saved_user.id]))

    # Act
    response = await client.post("/api/auth/logout")

    # Assert
    assert response.status_code == 204
    assert client.cookies.get("longlink_auth") is None
    accounts_response = await client.get("/api/auth/accounts")
    me_response = await client.get("/api/me")
    assert accounts_response.status_code == 200
    assert accounts_response.json() == [UserSummary.model_validate(saved_user).model_dump(mode="json")]
    assert me_response.status_code == 401
