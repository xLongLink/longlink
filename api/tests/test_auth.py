import pytest
from src import auth
from uuid import uuid4
from types import SimpleNamespace
from fastapi import HTTPException
from starlette.requests import Request

pytestmark = pytest.mark.no_db


async def test_authuser_rejects_inactive_identity_directly(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reject a session whose claimed identity is no longer active."""

    # Arrange
    async def active(_session: object, _user_id: object) -> None:
        """Return no active user."""

        return None

    monkeypatch.setattr(auth.token, "auth_token_claims", lambda _credential: (uuid4(), "fingerprint"))
    monkeypatch.setattr(auth.user_service, "active", active)
    request = Request({"type": "http", "headers": []})

    # Act
    with pytest.raises(HTTPException) as exc:
        await auth.authuser(request, "credential", object())

    # Assert
    assert exc.value.status_code == 401
    assert exc.value.detail == "Not authenticated"


async def test_authuser_marks_request_for_valid_identity_directly(monkeypatch: pytest.MonkeyPatch) -> None:
    """Mark requests authenticated after validating the password fingerprint."""

    # Arrange
    user = SimpleNamespace(password="password")

    async def active(_session: object, _user_id: object) -> object:
        """Return the active account."""

        return user

    monkeypatch.setattr(auth.token, "auth_token_claims", lambda _credential: (uuid4(), "fingerprint"))
    monkeypatch.setattr(auth.token, "password_fingerprint", lambda _password: "fingerprint")
    monkeypatch.setattr(auth.user_service, "active", active)
    request = Request({"type": "http", "headers": []})

    # Act
    result = await auth.authuser(request, "credential", object())

    # Assert
    assert result is user
    assert request.state.authenticated is True


async def test_authuser_rejects_changed_password_fingerprint(monkeypatch: pytest.MonkeyPatch) -> None:
    """Invalidate browser sessions after the account password changes."""

    # Arrange
    user = SimpleNamespace(password="changed-password")

    async def active(_session: object, _user_id: object) -> object:
        """Return the active account with its new password."""

        return user

    monkeypatch.setattr(auth.token, "auth_token_claims", lambda _credential: (uuid4(), "old-fingerprint"))
    monkeypatch.setattr(auth.token, "password_fingerprint", lambda _password: "new-fingerprint")
    monkeypatch.setattr(auth.user_service, "active", active)
    request = Request({"type": "http", "headers": []})

    # Act
    with pytest.raises(HTTPException) as exc:
        await auth.authuser(request, "credential", object())

    # Assert
    assert exc.value.status_code == 401
    assert exc.value.detail == "Not authenticated"
    assert not hasattr(request.state, "authenticated")


def test_authadmin_rejects_non_administrator_directly() -> None:
    """Require administrator status after authentication."""

    # Arrange
    user = SimpleNamespace(administrator=False)

    # Act
    with pytest.raises(HTTPException) as exc:
        auth.authadmin(user)

    # Assert
    assert exc.value.status_code == 403
    assert exc.value.detail == "Permission required"


async def test_organization_access_requires_membership_directly(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reject an authenticated user without Organization membership."""

    # Arrange
    async def membership(_session: object, _user_id: object, _organization_id: object) -> None:
        """Return no active membership."""

        return None

    monkeypatch.setattr(auth.organization_service, "membership", membership)

    # Act
    with pytest.raises(HTTPException) as exc:
        await auth.organization_access(uuid4(), SimpleNamespace(id=uuid4()), object())

    # Assert
    assert exc.value.status_code == 403
    assert exc.value.detail == "Access required"


async def test_organization_access_returns_membership_directly(monkeypatch: pytest.MonkeyPatch) -> None:
    """Return the resolved active Organization membership."""

    # Arrange
    expected_membership = object()

    async def membership(_session: object, _user_id: object, _organization_id: object) -> object:
        """Return the active membership."""

        return expected_membership

    monkeypatch.setattr(auth.organization_service, "membership", membership)

    # Act
    result = await auth.organization_access(uuid4(), SimpleNamespace(id=uuid4()), object())

    # Assert
    assert result is expected_membership
