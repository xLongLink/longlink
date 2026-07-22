import pytest
from main import app
from conftest import AUTH_COOKIE, TEST_PASSWORD, authenticated_cookies
from src.utils import mail as mail_module
from urllib.parse import parse_qs, urlparse
from src.models.users import UserProfile, UserListItem
from fastapi.testclient import TestClient
from src.database.models.users import User


def test_auth_config_reports_local_development_capabilities() -> None:
    """Expose local registration without unconfigured external providers."""

    client = TestClient(app)

    # Read the public capabilities used to construct the sign-in interface.
    response = client.get("/api/auth/config")

    assert response.status_code == 200
    assert response.json() == {
        "github_enabled": False,
    }


async def test_request_verify_token_does_not_enumerate_missing_accounts(monkeypatch: pytest.MonkeyPatch) -> None:
    """Return accepted without sending mail for an unknown verification email."""

    # Arrange
    messages: list[tuple[str, str, str, str | None]] = []

    async def capture_mail(recipient: str, subject: str, text: str, html: str | None = None) -> None:
        """Capture unexpected authentication email delivery."""

        messages.append((recipient, subject, text, html))

    monkeypatch.setattr(mail_module, "send_mail", capture_mail)
    client = TestClient(app)

    # Act
    response = client.post("/api/auth/request-verify-token", json={"email": "missing@example.com"})

    # Assert
    assert response.status_code == 202
    assert messages == []


def test_verify_email_rejects_invalid_token_without_cookie() -> None:
    """Reject an invalid verification token without creating a browser session."""

    # Arrange
    client = TestClient(app)

    # Act
    response = client.post("/api/auth/verify", json={"token": "not-a-valid-token"})

    # Assert
    assert response.status_code == 400
    assert response.json() == {"detail": "VERIFY_USER_BAD_TOKEN"}
    assert client.cookies.get(AUTH_COOKIE) is None


async def test_register_verify_and_password_login(monkeypatch: pytest.MonkeyPatch) -> None:
    """Register and verify a local user before creating a password session."""

    messages: list[tuple[str, str, str, str | None]] = []

    async def capture_mail(recipient: str, subject: str, text: str, html: str | None = None) -> None:
        """Capture an authentication email without using SMTP."""

        messages.append((recipient, subject, text, html))

    monkeypatch.setattr(mail_module, "send_mail", capture_mail)
    client = TestClient(app)

    # Register an unverified local account and capture its verification link.
    register_response = client.post(
        "/api/auth/register",
        json={"name": "Registered User", "email": "registered@example.com", "password": TEST_PASSWORD},
    )

    assert register_response.status_code == 201
    assert register_response.json()["name"] == "Registered User"
    assert register_response.json()["email"] == "registered@example.com"
    assert register_response.json()["is_verified"] is False
    assert messages[0][:2] == ("registered@example.com", "Welcome to LongLink")
    verification_url = next(
        line.removeprefix("Confirm your account: ")
        for line in messages[0][2].splitlines()
        if line.startswith("Confirm your account: ")
    )
    verification_token = parse_qs(urlparse(verification_url).query)["token"][0]
    assert verification_token
    assert messages[0][3] is not None
    assert verification_token in messages[0][3]
    assert "/auth/verify-email?email=registered%40example.com" in messages[0][3]
    assert "code=" not in messages[0][3]
    assert "token=" in messages[0][3]
    assert "Confirm account" in messages[0][3]
    assert "Welcome to" in messages[0][3]
    assert "Please confirm your email address" in messages[0][3]
    assert "If you did not sign up for LongLink" in messages[0][3]
    assert "expires in" not in messages[0][3]
    assert "https://github.com/xLongLink/longlink" in messages[0][3]
    assert "https://www.linkedin.com/company/longlink" in messages[0][3]
    assert "mailto:info@longlink.dev" in messages[0][3]

    # Require verification before password login, then accept the emailed link.
    unverified_login = client.post(
        "/api/auth/password/login",
        data={"username": "registered@example.com", "password": TEST_PASSWORD},
    )
    verify_response = client.post("/api/auth/verify", json={"token": verification_token})
    accounts_response = client.get("/api/auth/accounts")
    profile_response = client.get("/api/me")

    assert unverified_login.status_code == 400
    assert unverified_login.json() == {"detail": "LOGIN_USER_NOT_VERIFIED"}
    assert verify_response.status_code == 200
    assert verify_response.json()["is_verified"] is True
    assert client.cookies.get(AUTH_COOKIE)
    assert accounts_response.status_code == 200
    assert [account["id"] for account in accounts_response.json()] == [register_response.json()["id"]]
    assert profile_response.status_code == 200
    assert profile_response.json()["id"] == register_response.json()["id"]

    # Reusing a valid verification link for an already verified account still creates a browser session.
    repeat_client = TestClient(app)
    repeat_response = repeat_client.post("/api/auth/verify", json={"token": verification_token})
    repeat_profile_response = repeat_client.get("/api/me")

    assert repeat_response.status_code == 200
    assert repeat_response.json()["is_verified"] is True
    assert repeat_client.cookies.get(AUTH_COOKIE)
    assert repeat_profile_response.status_code == 200
    assert repeat_profile_response.json()["id"] == register_response.json()["id"]

    # Password login still works after the verification-link login path.
    login_response = client.post(
        "/api/auth/password/login",
        data={"username": "registered@example.com", "password": TEST_PASSWORD},
    )

    assert login_response.status_code == 204


async def test_forgot_and_reset_password(users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch) -> None:
    """Reset a local password with the emailed one-time recovery token."""

    messages: list[tuple[str, str, str, str | None]] = []

    async def capture_mail(recipient: str, subject: str, text: str, html: str | None = None) -> None:
        """Capture an authentication email without using SMTP."""

        messages.append((recipient, subject, text, html))

    monkeypatch.setattr(mail_module, "send_mail", capture_mail)
    user, _, _ = users
    client = TestClient(app)

    # Request a reset token for the fixture account.
    forgot_response = client.post("/api/auth/forgot-password", json={"email": user.email})

    assert forgot_response.status_code == 202
    assert messages[0][:2] == (user.email, "Reset your LongLink password")

    # Replace the credential and prove only the new password authenticates.
    reset_token = messages[0][2].split("token=", 1)[1].strip()
    reset_response = client.post(
        "/api/auth/reset-password",
        json={"token": reset_token, "password": "replacement-password"},
    )
    old_login = client.post(
        "/api/auth/password/login",
        data={"username": user.email, "password": TEST_PASSWORD},
    )
    new_login = client.post(
        "/api/auth/password/login",
        data={"username": user.email, "password": "replacement-password"},
    )

    assert reset_response.status_code == 200
    assert old_login.status_code == 400
    assert old_login.json() == {"detail": "LOGIN_BAD_CREDENTIALS"}
    assert new_login.status_code == 204


async def test_list_accounts_returns_saved_local_accounts(users: tuple[User, User, User]) -> None:
    """Return the local users retained by the signed browser session."""

    user_one, user_two, _ = users
    client = TestClient(
        app,
        cookies=authenticated_cookies(user_two.id, [user_one.id, user_two.id]),
    )

    # Read the account switcher independently of the active auth token.
    response = client.get("/api/auth/accounts")

    assert response.status_code == 200
    assert response.json() == [
        UserListItem.model_validate(user_one).model_dump(mode="json"),
        UserListItem.model_validate(user_two).model_dump(mode="json"),
    ]


async def test_activate_account_switches_the_active_local_user(users: tuple[User, User, User]) -> None:
    """Replace the active database token with one for a saved local account."""

    user_one, user_two, _ = users
    client = TestClient(
        app,
        cookies=authenticated_cookies(user_one.id, [user_one.id, user_two.id]),
    )

    # Activate another UUID already retained in the signed account list.
    response = client.post(f"/api/auth/accounts/{user_two.id}/activate")

    assert response.status_code == 204

    # Preserve the account list while changing the authenticated profile.
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

    user_one, user_two, _ = users
    client = TestClient(app, cookies=authenticated_cookies(user_one.id))

    # Attempt to switch to a valid user not remembered by this browser.
    response = client.post(f"/api/auth/accounts/{user_two.id}/activate")

    assert response.status_code == 403
    assert response.json() == {"detail": "Account is not saved in this session"}


async def test_deactivate_account_clears_only_the_auth_cookie(users: tuple[User, User, User]) -> None:
    """Clear active authentication while retaining saved local accounts."""

    user_one, user_two, _ = users
    client = TestClient(
        app,
        cookies=authenticated_cookies(user_one.id, [user_one.id, user_two.id]),
    )

    # Revoke the active token without removing UUIDs from the account switcher.
    response = client.post("/api/auth/accounts/deactivate")

    assert response.status_code == 200
    assert response.json() == [
        UserListItem.model_validate(user_one).model_dump(mode="json"),
        UserListItem.model_validate(user_two).model_dump(mode="json"),
    ]

    # Keep saved accounts available while protected routes become anonymous.
    accounts_response = client.get("/api/auth/accounts")
    profile_response = client.get("/api/me")

    assert accounts_response.status_code == 200
    assert accounts_response.json() == [
        UserListItem.model_validate(user_one).model_dump(mode="json"),
        UserListItem.model_validate(user_two).model_dump(mode="json"),
    ]
    assert profile_response.status_code == 401
