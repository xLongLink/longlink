from main import app
from uuid import uuid4
from conftest import session_cookie, authenticated_cookies
from src.models.users import UserListItem
from fastapi.testclient import TestClient
from src.database.models.users import User


async def test_list_accounts_returns_saved_local_accounts(users: tuple[User, User, User]) -> None:
    """Return the local users retained by the signed browser session."""

    # Arrange
    user_one, user_two, _ = users
    client = TestClient(
        app,
        cookies=authenticated_cookies(user_two.id, [user_one.id, user_two.id]),
    )

    # Act
    response = client.get("/api/auth/accounts")

    # Assert
    assert response.status_code == 200
    assert response.json() == [
        UserListItem.model_validate(user_one).model_dump(mode="json"),
        UserListItem.model_validate(user_two).model_dump(mode="json"),
    ]


async def test_list_accounts_skips_stale_saved_users(users: tuple[User, User, User]) -> None:
    """Return only persisted users from saved account session state."""

    # Arrange
    saved, _, _ = users
    client = TestClient(app, cookies=session_cookie([saved.id, uuid4()]))

    # Act
    response = client.get("/api/auth/accounts")

    # Assert
    assert response.status_code == 200
    assert response.json() == [UserListItem.model_validate(saved).model_dump(mode="json")]


async def test_deactivate_account_clears_only_the_auth_cookie(users: tuple[User, User, User]) -> None:
    """Clear active authentication while retaining saved local accounts."""

    # Arrange
    user_one, user_two, _ = users
    client = TestClient(
        app,
        cookies=authenticated_cookies(user_one.id, [user_one.id, user_two.id]),
    )

    # Act
    response = client.post("/api/auth/accounts/deactivate")

    # Assert
    assert response.status_code == 200
    assert response.json() == [
        UserListItem.model_validate(user_one).model_dump(mode="json"),
        UserListItem.model_validate(user_two).model_dump(mode="json"),
    ]
    accounts_response = client.get("/api/auth/accounts")
    profile_response = client.get("/api/me")
    assert accounts_response.status_code == 200
    assert accounts_response.json() == [
        UserListItem.model_validate(user_one).model_dump(mode="json"),
        UserListItem.model_validate(user_two).model_dump(mode="json"),
    ]
    assert profile_response.status_code == 401


async def test_logout_clears_the_active_account(users: tuple[User, User, User]) -> None:
    """Remove only the active account from the saved browser session."""

    # Arrange
    user_one, user_two, _ = users
    client = TestClient(
        app,
        cookies=authenticated_cookies(user_one.id, [user_one.id, user_two.id]),
    )

    # Act
    response = client.post("/api/auth/logout")

    # Assert
    assert response.status_code == 204
    accounts_response = client.get("/api/auth/accounts")
    me_response = client.get("/api/me")
    assert accounts_response.status_code == 200
    assert accounts_response.json() == [UserListItem.model_validate(user_two).model_dump(mode="json")]
    assert me_response.status_code == 401
