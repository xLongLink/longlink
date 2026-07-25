import pytest
from main import app
from conftest import AUTH_COOKIE, TEST_PASSWORD, authenticated_cookies
from sqlmodel import col, select
from src.utils import mail as mail_module
from urllib.parse import parse_qs, urlparse
from fastapi.testclient import TestClient
from src.database.session import get_session
from src.database.models.users import User, AccessToken


def test_auth_config_reports_local_development_capabilities() -> None:
    """Expose local registration without unconfigured external providers."""

    client = TestClient(app)

    # Read the public capabilities used to construct the sign-in interface.
    response = client.get("/api/auth/config")

    assert response.status_code == 200
    assert response.json() == {
        "github_enabled": False,
    }


async def test_registration_request_does_not_enumerate_existing_accounts(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Return accepted without sending registration mail for an existing account."""

    # Arrange
    messages: list[tuple[str, str, str, str | None]] = []

    async def capture_mail(recipient: str, subject: str, text: str, html: str | None = None) -> None:
        """Capture unexpected authentication email delivery."""

        messages.append((recipient, subject, text, html))

    monkeypatch.setattr(mail_module, "send_mail", capture_mail)
    client = TestClient(app)

    # Act
    response = client.post("/api/auth/register", json={"email": users[0].email})

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


def test_verify_email_rejects_blank_token_payload() -> None:
    """Reject malformed verification payloads before token verification runs."""

    # Arrange
    client = TestClient(app)

    # Act
    response = client.post("/api/auth/verify", json={"token": ""})

    # Assert
    assert response.status_code == 422
    assert client.cookies.get(AUTH_COOKIE) is None


async def test_register_verify_and_password_login(monkeypatch: pytest.MonkeyPatch) -> None:
    """Create an authenticated account only after email and profile completion."""

    # Arrange
    email = "registered@example.com"
    registration_payload = {"email": email, "next": "/orgs/example"}
    completion_payload = {
        "name": "Registered",
        "email": email,
        "surname": "User",
        "password": TEST_PASSWORD,
    }
    login_payload = {"username": email, "password": TEST_PASSWORD}
    messages: list[tuple[str, str, str, str | None]] = []

    async def capture_mail(recipient: str, subject: str, text: str, html: str | None = None) -> None:
        """Capture an authentication email without using SMTP."""

        messages.append((recipient, subject, text, html))

    monkeypatch.setattr(mail_module, "send_mail", capture_mail)
    client = TestClient(app)

    # Request a stateless email link without creating a pending user.
    register_response = client.post("/api/auth/register", json=registration_payload)
    Session = await get_session()
    async with Session() as session:
        pending_user = (await session.execute(select(User).where(col(User.email) == email))).scalar_one_or_none()

    assert register_response.status_code == 202
    assert pending_user is None
    assert messages[0][:2] == (email, "Welcome to LongLink")
    verification_url = next(
        line.removeprefix("Continue account setup: ") for line in messages[0][2].splitlines() if line.startswith("Continue account setup: ")
    )
    verification_token = parse_qs(urlparse(verification_url).fragment)["token"][0]
    assert verification_token
    assert messages[0][3] is not None
    assert verification_token in messages[0][3]
    assert "/auth/verify-email#token=" in messages[0][3]
    assert "email=" not in messages[0][3]
    assert "code=" not in messages[0][3]
    assert "token=" in messages[0][3]
    assert "Continue account setup" in messages[0][3]
    assert "Welcome to" in messages[0][3]
    assert "continue account setup" in messages[0][3]
    assert "If you did not sign up for LongLink" in messages[0][3]
    assert "expires in" not in messages[0][3]
    assert "https://github.com/xLongLink/longlink" in messages[0][3]
    assert "https://www.linkedin.com/company/longlink" in messages[0][3]
    assert "mailto:info@longlink.dev" in messages[0][3]

    # Verify email ownership without creating a user or browser session.
    verify_response = client.post("/api/auth/verify", json={"token": verification_token})
    async with Session() as session:
        verified_pending_user = (await session.execute(select(User).where(col(User.email) == email))).scalar_one_or_none()

    assert verify_response.status_code == 200
    assert verify_response.json() == {"email": email, "next": "/orgs/example"}
    assert verified_pending_user is None
    assert client.cookies.get(AUTH_COOKIE) is None

    # Complete profile and password setup in the same transaction as the first session.
    unauthenticated_login = client.post("/api/auth/password/login", data=login_payload)
    restored_setup = client.get("/api/auth/register/setup")
    mismatched_setup = client.post(
        "/api/auth/register/complete",
        json={**completion_payload, "email": "another@example.com"},
    )
    complete_response = client.post(
        "/api/auth/register/complete",
        json=completion_payload,
    )
    accounts_response = client.get("/api/auth/accounts")
    profile_response = client.get("/api/me")

    assert unauthenticated_login.status_code == 400
    assert unauthenticated_login.json() == {"detail": "LOGIN_BAD_CREDENTIALS"}
    assert restored_setup.status_code == 200
    assert restored_setup.json() == {"email": email, "next": "/orgs/example"}
    assert mismatched_setup.status_code == 400
    assert mismatched_setup.json() == {"detail": "REGISTER_SETUP_MISMATCH"}
    assert complete_response.status_code == 201
    registered_user = complete_response.json()
    assert registered_user["name"] == "Registered User"
    assert registered_user["email"] == email
    assert client.cookies.get(AUTH_COOKIE)
    assert client.cookies.get("longlink_registration") is None
    assert accounts_response.status_code == 200
    assert [account["id"] for account in accounts_response.json()] == [registered_user["id"]]
    assert profile_response.status_code == 200
    assert profile_response.json()["id"] == registered_user["id"]

    # Reusing a valid token cannot create or authenticate a duplicate account.
    repeat_client = TestClient(app)
    repeat_verify_response = repeat_client.post("/api/auth/verify", json={"token": verification_token})
    repeat_response = repeat_client.post(
        "/api/auth/register/complete",
        json=completion_payload,
    )

    assert repeat_verify_response.status_code == 200
    assert repeat_response.status_code == 400
    assert repeat_response.json() == {"detail": "REGISTER_USER_ALREADY_EXISTS"}
    assert repeat_client.cookies.get(AUTH_COOKIE) is None

    # Password login still works after the verification-link login path.
    login_response = client.post("/api/auth/password/login", data=login_payload)

    assert login_response.status_code == 204


async def test_forgot_and_reset_password(users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch) -> None:
    """Reset a local password with the emailed one-time recovery token."""

    messages: list[tuple[str, str, str, str | None]] = []

    async def capture_mail(recipient: str, subject: str, text: str, html: str | None = None) -> None:
        """Capture an authentication email without using SMTP."""

        messages.append((recipient, subject, text, html))

    monkeypatch.setattr(mail_module, "send_mail", capture_mail)
    user, _, _ = users
    client = TestClient(app, cookies=authenticated_cookies(user.id))

    # Missing and existing accounts receive the same response, while only the account gets mail.
    missing_response = client.post("/api/auth/forgot-password", json={"email": "missing@example.com"})
    forgot_response = client.post(
        "/api/auth/forgot-password",
        json={"email": user.email.upper(), "next": "/orgs/example"},
    )

    assert missing_response.status_code == 202
    assert forgot_response.status_code == 202
    assert messages[0][:2] == (user.email, "Reset your LongLink password")
    reset_url = next(line for line in messages[0][2].splitlines() if line.startswith("http"))
    parsed_reset_url = urlparse(reset_url)
    assert parse_qs(parsed_reset_url.query) == {"next": ["/orgs/example"]}
    assert "token" not in parse_qs(parsed_reset_url.query)

    # Exchange fragment proof for an HTTP-only cookie before replacing the credential.
    reset_token = parse_qs(parsed_reset_url.fragment)["token"][0]
    verify_response = client.post("/api/auth/reset-password/verify", json={"token": reset_token})
    setup_response = client.get("/api/auth/reset-password/setup")
    reset_response = client.post(
        "/api/auth/reset-password",
        json={"password": "replacement-password"},
    )
    revoked_session = client.get("/api/me")
    Session = await get_session()
    async with Session() as session:
        existing_tokens = (await session.execute(select(AccessToken).where(AccessToken.user_id == user.id))).scalars().all()

    assert verify_response.status_code == 204
    assert setup_response.status_code == 204
    assert reset_response.status_code == 204
    assert revoked_session.status_code == 401
    assert existing_tokens == []

    # Prove only the new password can create a fresh session.
    old_login = client.post(
        "/api/auth/password/login",
        data={"username": user.email, "password": TEST_PASSWORD},
    )
    new_login = client.post(
        "/api/auth/password/login",
        data={"username": user.email, "password": "replacement-password"},
    )

    assert old_login.status_code == 400
    assert old_login.json() == {"detail": "LOGIN_BAD_CREDENTIALS"}
    assert new_login.status_code == 204
