import pytest
from fastapi import HTTPException

from src.auth import authuser
from src.db.models import User
from src.routes.auth import logout


async def test_authuser_returns_user_from_session(users: tuple[User, User, User]) -> None:
    """Return the persisted user when the session contains a valid user id."""

    # Arrange
    user = users[0]

    class RequestStub:
        """Minimal request stub for session-based auth tests."""

        session = {"userid": str(user.id)}

    request = RequestStub()

    # Act
    result = await authuser(request)

    # Assert
    assert result.id == user.id
    assert result.email == user.email
    assert result.name == user.name


async def test_authuser_rejects_missing_session_user() -> None:
    """Reject requests without a session user id."""

    # Arrange

    class RequestStub:
        """Minimal request stub for session-based auth tests."""

        session: dict[str, str] = {}

    request = RequestStub()

    # Act
    with pytest.raises(HTTPException) as exc:
        await authuser(request)

    # Assert
    assert exc.value.status_code == 401
    assert exc.value.detail == "Not authenticated"


async def test_logout_clears_session_and_redirects_home() -> None:
    """Clear the session and redirect home."""

    # Arrange
    class RequestStub:
        """Minimal request stub for session-based logout tests."""

        session = {"userid": "123"}

    request = RequestStub()

    # Act
    response = await logout(request)

    # Assert
    assert response.status_code == 307
    assert response.headers["location"] == "/"
    assert request.session == {}
