import pytest
from fastapi import HTTPException

from src.auth import authadmin, authuser
from src.db.models import User
from src.routes.auth import logout


async def test_authuser_returns_user_from_session(users: tuple[User, User, User]) -> None:
    """Return the persisted user when the session contains a valid OIDC subject."""

    # Arrange
    user = users[0]

    class RequestStub:
        """Minimal request stub for session-based auth tests."""

        session = {"oidc_subject": str(user.oidc_subject)}

    request = RequestStub()

    # Act
    result = await authuser(request)

    # Assert
    assert result.id == user.id
    assert result.email == user.email
    assert result.name == user.name


async def test_authadmin_returns_admin_user_from_session(users: tuple[User, User, User]) -> None:
    """Return the persisted admin user when the session is valid."""

    # Arrange
    user = users[0]

    class RequestStub:
        """Minimal request stub for session-based auth tests."""

        session = {"oidc_subject": str(user.oidc_subject)}

    request = RequestStub()

    # Act
    result = await authadmin(request)

    # Assert
    assert result.id == user.id
    assert result.email == user.email
    assert result.name == user.name
    assert result.admin is True


async def test_authuser_rejects_missing_session_user() -> None:
    """Reject requests without a session OIDC subject."""

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


async def test_authadmin_rejects_non_admin_user(users: tuple[User, User, User]) -> None:
    """Reject authenticated users that do not have admin privileges."""

    # Arrange
    user = users[1]

    class RequestStub:
        """Minimal request stub for session-based auth tests."""

        session = {"oidc_subject": str(user.oidc_subject)}

    request = RequestStub()

    # Act
    with pytest.raises(HTTPException) as exc:
        await authadmin(request)

    # Assert
    assert exc.value.status_code == 403
    assert exc.value.detail == "Admin privileges required"


async def test_logout_clears_session_and_redirects_home() -> None:
    """Clear the session and redirect home."""

    # Arrange
    class RequestStub:
        """Minimal request stub for session-based logout tests."""

        session = {"oidc_subject": "oidc-subject"}

    request = RequestStub()

    # Act
    response = await logout(request)

    # Assert
    assert response.status_code == 307
    assert response.headers["location"] == "/"
    assert request.session == {}
