from uuid import uuid4
from main import app
from conftest import AUTH_COOKIE, session_cookie, authenticated_cookies
from fastapi.testclient import TestClient
from src.database.session import get_session
from src.models.users import UserProfile, UserListItem
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


async def test_list_accounts_skips_stale_and_unverified_saved_users(users: tuple[User, User, User]) -> None:
    """Return only active verified users from saved account session state."""

    # Arrange
    verified, unverified, _ = users
    Session = await get_session()
    async with Session() as session:
        persisted = await session.get(User, unverified.id)
        assert persisted is not None
        persisted.is_verified = False
        await session.commit()
    client = TestClient(app, cookies=session_cookie([verified.id, unverified.id, uuid4()]))

    # Act
    response = client.get("/api/auth/accounts")

    # Assert
    assert response.status_code == 200
    assert response.json() == [UserListItem.model_validate(verified).model_dump(mode="json")]


async def test_activate_account_switches_the_active_local_user(users: tuple[User, User, User]) -> None:
    """Replace the active database token with one for a saved local account."""

    # Arrange
    user_one, user_two, _ = users
    client = TestClient(
        app,
        cookies=authenticated_cookies(user_one.id, [user_one.id, user_two.id]),
    )

    # Act
    response = client.post(f"/api/auth/accounts/{user_two.id}/activate")

    # Assert
    assert response.status_code == 204
    accounts_response = client.get("/api/auth/accounts")
    profile_response = client.get("/api/me")
    assert accounts_response.status_code == 200
    assert accounts_response.json() == [
        UserListItem.model_validate(user_one).model_dump(mode="json"),
        UserListItem.model_validate(user_two).model_dump(mode="json"),
    ]
    assert profile_response.status_code == 200
    assert profile_response.json() == UserProfile.model_validate(user_two).model_dump(mode="json")


async def test_activate_account_rejects_user_not_saved_in_session(users: tuple[User, User, User]) -> None:
    """Reject a local account UUID absent from the signed browser session."""

    # Arrange
    user_one, user_two, _ = users
    client = TestClient(app, cookies=authenticated_cookies(user_one.id))

    # Act
    response = client.post(f"/api/auth/accounts/{user_two.id}/activate")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Account is not saved in this session"}


async def test_activate_account_rejects_unverified_saved_user(users: tuple[User, User, User]) -> None:
    """Reject switching to a saved account that is no longer verified."""

    # Arrange
    active, unverified, _ = users
    Session = await get_session()
    async with Session() as session:
        persisted = await session.get(User, unverified.id)
        assert persisted is not None
        persisted.is_verified = False
        await session.commit()
    client = TestClient(app, cookies=authenticated_cookies(active.id, [active.id, unverified.id]))

    # Act
    response = client.post(f"/api/auth/accounts/{unverified.id}/activate")

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Account not found"}
    assert client.cookies.get(AUTH_COOKIE) == str(active.id)


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
