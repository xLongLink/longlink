from fastapi.testclient import TestClient

from conftest import session_cookie
from main import app
from src.database.models.users import User
from src.database.services.users import users as users_service
from src.models.users import UserListItem, UserProfile


async def test_list_accounts_returns_current_active_account(
    users: tuple[User, User, User],
) -> None:
    """Return the saved session accounts for the login screen."""

    # Arrange
    user_one, user_two, _ = users
    client = TestClient(
        app,
        cookies=session_cookie(str(user_two.oidc), [str(user_one.oidc), str(user_two.oidc)]),
    )

    # Act
    response = client.get("/accounts")

    # Assert
    assert response.status_code == 200
    assert response.json() == [
        UserListItem.model_validate(user_one).model_dump(mode="json"),
        UserListItem.model_validate(user_two).model_dump(mode="json"),
    ]


async def test_activate_account_switches_the_active_session_account(
    users: tuple[User, User, User],
) -> None:
    """Switch the active account inside the saved session list."""

    # Arrange
    user_one, user_two, _ = users
    client = TestClient(
        app,
        cookies=session_cookie(str(user_one.oidc), [str(user_one.oidc), str(user_two.oidc)]),
    )

    # Act
    response = client.post(f"/auth/accounts/{user_two.oidc}/activate")

    # Assert
    assert response.status_code == 200

    accounts_response = client.get("/accounts")
    assert accounts_response.status_code == 200
    assert accounts_response.json() == [
        UserListItem.model_validate(user_one).model_dump(mode="json"),
        UserListItem.model_validate(user_two).model_dump(mode="json"),
    ]

    me_response = client.get("/api/me")
    assert me_response.status_code == 200
    current_profile = await users_service.profile(user_two.id)
    assert current_profile is not None
    assert me_response.json() == UserProfile.model_validate(current_profile.model_dump()).model_dump(mode="json")


async def test_deactivate_account_clears_only_the_active_session_account(
    users: tuple[User, User, User],
) -> None:
    """Clear the active account without removing saved accounts."""

    # Arrange
    user_one, user_two, _ = users
    client = TestClient(
        app,
        cookies=session_cookie(str(user_one.oidc), [str(user_one.oidc), str(user_two.oidc)]),
    )

    # Act
    response = client.post("/auth/accounts/deactivate")

    # Assert
    assert response.status_code == 200
    assert response.json() == [
        UserListItem.model_validate(user_one).model_dump(mode="json"),
        UserListItem.model_validate(user_two).model_dump(mode="json"),
    ]

    accounts_response = client.get("/accounts")
    assert accounts_response.status_code == 200
    assert accounts_response.json() == [
        UserListItem.model_validate(user_one).model_dump(mode="json"),
        UserListItem.model_validate(user_two).model_dump(mode="json"),
    ]

    me_response = client.get("/api/me")
    assert me_response.status_code == 401
