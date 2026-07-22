from uuid import uuid4
from main import app
from conftest import AUTH_COOKIE, session_cookie, authenticated_cookies
from fastapi.testclient import TestClient
from src.database.session import get_session
from src.models.users import UserListItem
from src.database.models.users import User


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
