import pytest
from main import app
from httpx2 import AsyncClient, ASGITransport
from conftest import TEST_PASSWORD, authenticated_cookies
from sqlmodel import col, select
from urllib.parse import parse_qs, urlparse
from src.environments import env
from src.database.session import get_session
from src.database.models.users import User


async def test_registration_request_does_not_enumerate_existing_accounts(
    client: AsyncClient, users: tuple[User, User, User], captured_mail: list[tuple[str, str, str, str | None]]
) -> None:
    """Return accepted without sending registration mail for an existing account."""

    # Act
    response = await client.post("/api/v1/auth/register", json={"email": users[0].email})

    # Assert
    assert response.status_code == 202
    assert captured_mail == []


@pytest.mark.no_db
async def test_verify_email_rejects_invalid_token_without_cookie(client: AsyncClient) -> None:
    """Reject an invalid verification token without creating a browser session."""

    # Act
    response = await client.post("/api/v1/auth/verify", json={"token": "not-a-valid-token"})

    # Assert
    assert response.status_code == 400
    assert response.json() == {"detail": "VERIFY_USER_BAD_TOKEN"}
    assert client.cookies.get("longlink_auth") is None


async def test_register_verify_and_password_login(client: AsyncClient, captured_mail: list[tuple[str, str, str, str | None]]) -> None:
    """Create an authenticated account only after email and profile completion."""

    # Arrange
    email = "registered@example.com"
    completion_payload = {
        "name": "Registered",
        "email": email,
        "surname": "User",
        "password": TEST_PASSWORD,
    }
    login_payload = {"email": email, "password": TEST_PASSWORD}
    # Request a stateless email link without creating a pending user.
    register_response = await client.post("/api/v1/auth/register", json={"email": email})
    Session = await get_session()
    async with Session() as session:
        pending_user = (await session.execute(select(User).where(col(User.email) == email))).scalar_one_or_none()

    assert register_response.status_code == 202
    assert pending_user is None
    assert captured_mail[0][0] == email
    verification_url = next(
        line.removeprefix("Continue account setup: ")
        for line in captured_mail[0][2].splitlines()
        if line.startswith("Continue account setup: ")
    )
    verification_token = parse_qs(urlparse(verification_url).fragment)["token"][0]
    assert verification_token
    assert captured_mail[0][3] is not None
    assert verification_token in captured_mail[0][3]
    assert "/auth/verify-email#token=" in captured_mail[0][3]
    assert "email=" not in captured_mail[0][3]
    assert "code=" not in captured_mail[0][3]

    # Verify email ownership without creating a user or browser session.
    verify_response = await client.post("/api/v1/auth/verify", json={"token": verification_token})
    async with Session() as session:
        verified_pending_user = (await session.execute(select(User).where(col(User.email) == email))).scalar_one_or_none()

    assert verify_response.status_code == 200
    assert verify_response.json() == {"email": email}
    assert verified_pending_user is None
    assert client.cookies.get("longlink_auth") is None

    # Complete profile and password setup in the same transaction as the first session.
    unauthenticated_login = await client.post("/api/v1/auth/password/login", json=login_payload)
    restored_setup = await client.get("/api/v1/auth/register/setup")
    mismatched_setup = await client.post(
        "/api/v1/auth/register/complete",
        json={**completion_payload, "email": "another@example.com"},
    )
    complete_response = await client.post(
        "/api/v1/auth/register/complete",
        json=completion_payload,
    )
    profile_response = await client.get("/api/v1/me")

    assert unauthenticated_login.status_code == 400
    assert unauthenticated_login.json() == {"detail": "LOGIN_BAD_CREDENTIALS"}
    assert restored_setup.status_code == 200
    assert restored_setup.json() == {"email": email}
    assert mismatched_setup.status_code == 400
    assert mismatched_setup.json() == {"detail": "REGISTER_SETUP_MISMATCH"}
    assert complete_response.status_code == 201
    registered_user = complete_response.json()
    assert registered_user["name"] == "Registered User"
    assert registered_user["email"] == email
    assert client.cookies.get("longlink_auth")
    assert client.cookies.get("longlink_registration") is None
    assert profile_response.status_code == 200
    assert profile_response.json()["id"] == registered_user["id"]

    # Reusing a valid token cannot create or authenticate a duplicate account.
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as repeat_client:
        repeat_verify_response = await repeat_client.post("/api/v1/auth/verify", json={"token": verification_token})
        repeat_response = await repeat_client.post(
            "/api/v1/auth/register/complete",
            json=completion_payload,
        )

    assert repeat_verify_response.status_code == 200
    assert repeat_response.status_code == 400
    assert repeat_response.json() == {"detail": "REGISTER_USER_ALREADY_EXISTS"}
    assert repeat_client.cookies.get("longlink_auth") is None

    # Password login still works after the verification-link login path.
    login_response = await client.post("/api/v1/auth/password/login", json=login_payload)

    assert login_response.status_code == 204


async def test_forgot_and_reset_password(
    client: AsyncClient, users: tuple[User, User, User], captured_mail: list[tuple[str, str, str, str | None]]
) -> None:
    """Reset a local password with the emailed one-time recovery token."""

    user, _, _ = users
    client.cookies.update(authenticated_cookies(user))

    # Missing and existing accounts receive the same response, while only the account gets mail.
    missing_response = await client.post("/api/v1/auth/forgot-password", json={"email": "missing@example.com"})
    forgot_response = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": user.email.upper()},
    )

    assert missing_response.status_code == 202
    assert forgot_response.status_code == 202
    assert captured_mail[0][0] == user.email
    reset_url = next(line for line in captured_mail[0][2].splitlines() if line.startswith("http"))
    parsed_reset_url = urlparse(reset_url)
    assert parse_qs(parsed_reset_url.query) == {}

    # Exchange fragment proof for an HTTP-only cookie before replacing the credential.
    reset_token = parse_qs(parsed_reset_url.fragment)["token"][0]
    verify_response = await client.post("/api/v1/auth/reset-password/verify", json={"token": reset_token})
    setup_response = await client.get("/api/v1/auth/reset-password/setup")
    reset_response = await client.post(
        "/api/v1/auth/reset-password",
        json={"password": "replacement-password"},
    )
    revoked_session = await client.get("/api/v1/me")
    assert verify_response.status_code == 204
    assert setup_response.status_code == 204
    assert reset_response.status_code == 204
    assert revoked_session.status_code == 401

    # Prove only the new password can create a fresh session.
    old_login = await client.post(
        "/api/v1/auth/password/login",
        json={"email": user.email, "password": TEST_PASSWORD},
    )
    new_login = await client.post(
        "/api/v1/auth/password/login",
        json={"email": user.email, "password": "replacement-password"},
    )

    assert old_login.status_code == 400
    assert old_login.json() == {"detail": "LOGIN_BAD_CREDENTIALS"}
    assert new_login.status_code == 204


async def test_authenticated_logout_rejects_cross_origin_request(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Prevent a foreign origin from clearing an authenticated browser session."""

    # Send a credentialed logout request initiated by an untrusted origin.
    client = clients[0]
    response = await client.post("/api/v1/auth/logout", headers={"origin": "https://attacker.example"})
    profile_response = await client.get("/api/v1/me")

    # Reject CSRF logout attempts without expiring the caller's authenticated session.
    assert response.status_code == 403
    assert "set-cookie" not in response.headers
    assert profile_response.status_code == 200


async def test_password_login_sets_production_session_security_and_cache_attributes(
    client: AsyncClient,
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Issue a production browser session only as a secure, private credential."""

    # Make the route render production cookie attributes.
    monkeypatch.setattr(env, "DEVELOPMENT", False)
    user = users[0]

    # Authenticate with the production cookie policy.
    response = await client.post(
        "/api/v1/auth/password/login",
        json={"email": user.email, "password": TEST_PASSWORD},
    )

    # Verify the credential cannot be read by scripts, sent insecurely, or cached.
    assert response.status_code == 204
    assert response.headers["cache-control"] == "no-store"
    cookie = response.headers["set-cookie"]
    assert "longlink_auth=" in cookie
    assert "HttpOnly" in cookie
    assert "Max-Age=2592000" in cookie
    assert "Path=/" in cookie
    assert "SameSite=lax" in cookie
    assert "Secure" in cookie
