import pytest
from src import auth
from main import app
from httpx2 import AsyncClient
from conftest import TEST_PASSWORD, create_client
from sqlmodel import col, select
from factories import create_organization
from src.utils import token
from urllib.parse import parse_qs, urlparse
from src.environments import env
from src.models.roles import OrganizationRoles
from longlink.utils.time import utcnow
from src.database.session import get_session, session_scope
from src.database.services import invitations
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.invitations import OrganizationInvitation

INVALID_REGISTRATION_LINK = "This registration link is invalid or expired. Request a new link to continue."


def registration_verification_token(captured_mail: list[tuple[str, str, str, str | None]]) -> str:
    """Extract the registration token from captured verification mail."""

    # Read the fragment-only credential from the registration link.
    verification_url = next(
        line.removeprefix("Continue account setup: ")
        for line in captured_mail[0][2].splitlines()
        if line.startswith("Continue account setup: ")
    )
    return parse_qs(urlparse(verification_url).fragment)["token"][0]


async def register_and_verify(client: AsyncClient, captured_mail: list[tuple[str, str, str, str | None]], email: str) -> str:
    """Register an email address and return its verified setup token."""

    # Complete the shared unauthenticated registration setup.
    register_response = await client.post("/api/v1/auth/register", json={"email": email})
    assert register_response.status_code == 202
    verification_token = registration_verification_token(captured_mail)
    verify_response = await client.post("/api/v1/auth/verify", json={"token": verification_token})
    assert verify_response.status_code == 200
    return verification_token


def password_reset_token(captured_mail: list[tuple[str, str, str, str | None]]) -> str:
    """Return the reset token from the latest captured password-reset email."""

    # Extract browser-only proof from the password-reset link fragment.
    reset_url = next(line for line in captured_mail[0][2].splitlines() if line.startswith("http"))
    return parse_qs(urlparse(reset_url).fragment)["token"][0]


def capture_synchronized_organization_ids(monkeypatch: pytest.MonkeyPatch) -> list[object]:
    """Record Organization membership projections without a database adapter."""

    # Replace the external projection boundary with an observable local sink.
    synchronized_organization_ids: list[object] = []

    async def sync_users(_session: object, organization_id: object) -> None:
        """Record one requested Organization projection."""

        synchronized_organization_ids.append(organization_id)

    monkeypatch.setattr("src.routes.v1.auth.organizations.sync_users", sync_users)
    return synchronized_organization_ids


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
    assert response.json() == {"detail": INVALID_REGISTRATION_LINK}
    assert client.cookies.get("longlink_auth") is None


@pytest.mark.no_db
async def test_malformed_browser_session_is_rejected_before_database_lookup(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reject malformed browser credentials without opening an identity lookup."""

    # Arrange
    async def get_session():
        """Provide an unused dependency session for the rejected credential."""

        yield object()

    async def unexpected_active(*_args: object) -> object:
        """Fail if malformed credentials reach the user database query."""

        raise AssertionError("malformed credentials must not query users")

    monkeypatch.setattr(app, "dependency_overrides", {auth.get_session: get_session})
    monkeypatch.setattr(auth.user_service, "active", unexpected_active)
    client.cookies.set("longlink_auth", "invalid", domain="testserver.local", path="/")

    # Act
    response = await client.get("/api/v1/me")

    # Assert
    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


async def test_registration_setup_rejects_missing_verification_cookie(client: AsyncClient) -> None:
    """Require verified browser registration state before exposing setup details."""

    # Act
    response = await client.get("/api/v1/auth/register/setup")

    # Assert
    assert response.status_code == 400
    assert response.json() == {"detail": INVALID_REGISTRATION_LINK}


async def test_registration_completion_rejects_missing_verification_cookie(client: AsyncClient) -> None:
    """Prevent account creation without verified browser registration state."""

    # Act
    response = await client.post(
        "/api/v1/auth/register/complete",
        json={"name": "Registered User", "password": TEST_PASSWORD},
    )

    # Assert
    assert response.status_code == 400
    assert response.json() == {"detail": INVALID_REGISTRATION_LINK}
    assert client.cookies.get("longlink_auth") is None


async def test_registration_verification_is_stateless(
    client: AsyncClient,
    captured_mail: list[tuple[str, str, str, str | None]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify email ownership without creating an account or browser session."""

    # Arrange
    email = "registered@example.com"

    # Render the browser credential with its production security policy.
    monkeypatch.setattr(env, "DEVELOPMENT", False)

    # Request a stateless email link without creating a pending user.
    register_response = await client.post("/api/v1/auth/register", json={"email": email})
    Session = await get_session()

    assert register_response.status_code == 202
    assert captured_mail[0][0] == email
    verification_token = registration_verification_token(captured_mail)
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
    assert verify_response.headers["cache-control"] == "no-store"
    cookie = verify_response.headers["set-cookie"]
    assert "longlink_registration=" in cookie
    assert "HttpOnly" in cookie
    assert f"Max-Age={token.EMAIL_TOKEN_LIFETIME_SECONDS}" in cookie
    assert "Path=/api/v1/auth/register" in cookie
    assert "SameSite=lax" in cookie
    assert "Secure" in cookie


async def test_registration_completion_creates_authenticated_account(
    client: AsyncClient, captured_mail: list[tuple[str, str, str, str | None]]
) -> None:
    """Create an authenticated account only after verified profile completion."""

    # Arrange
    email = "registered@example.com"
    completion_payload = {"name": "Registered User", "password": TEST_PASSWORD}
    login_payload = {"email": email, "password": TEST_PASSWORD}
    await register_and_verify(client, captured_mail, email)

    # Act
    unauthenticated_login = await client.post("/api/v1/auth/password/login", json=login_payload)
    restored_setup = await client.get("/api/v1/auth/register/setup")
    complete_response = await client.post(
        "/api/v1/auth/register/complete",
        json=completion_payload,
    )
    profile_response = await client.get("/api/v1/me")
    authenticated_login = await client.post("/api/v1/auth/password/login", json=login_payload)

    # Assert
    assert unauthenticated_login.status_code == 400
    assert unauthenticated_login.json() == {"detail": "LOGIN_BAD_CREDENTIALS"}
    assert restored_setup.status_code == 200
    assert restored_setup.json() == {"email": email}
    assert restored_setup.headers["cache-control"] == "no-store"
    assert complete_response.status_code == 201
    registered_user = complete_response.json()
    assert registered_user["name"] == "Registered User"
    assert registered_user["email"] == email
    assert client.cookies.get("longlink_auth")
    assert client.cookies.get("longlink_registration") is None
    assert profile_response.status_code == 200
    assert profile_response.json()["id"] == registered_user["id"]
    assert authenticated_login.status_code == 204


async def test_password_login_rejects_wrong_password_and_unknown_email_without_session(
    client: AsyncClient,
    users: tuple[User, User, User],
) -> None:
    """Keep failed password login responses indistinguishable and unauthenticated."""

    # Arrange
    email = users[0].email

    # Act
    wrong_password_response = await client.post(
        "/api/v1/auth/password/login",
        json={"email": email, "password": "wrong-password"},
    )
    unknown_email_response = await client.post(
        "/api/v1/auth/password/login",
        json={"email": "missing@example.com", "password": TEST_PASSWORD},
    )

    # Assert
    assert wrong_password_response.status_code == 400
    assert unknown_email_response.status_code == 400
    assert wrong_password_response.json() == unknown_email_response.json() == {"detail": "LOGIN_BAD_CREDENTIALS"}
    assert "set-cookie" not in wrong_password_response.headers
    assert "set-cookie" not in unknown_email_response.headers
    assert client.cookies.get("longlink_auth") is None


async def test_password_login_rejects_deleted_account_with_correct_password_without_session(
    client: AsyncClient,
    users: tuple[User, User, User],
) -> None:
    """Reject a deleted account even when its password remains valid."""

    # Arrange
    user = users[0]
    async with session_scope() as session:
        deleted_user = await session.get(User, user.id)
        assert deleted_user is not None
        deleted_user.deleted_at = utcnow()
        await session.commit()

    # Act
    response = await client.post(
        "/api/v1/auth/password/login",
        json={"email": user.email, "password": TEST_PASSWORD},
    )

    # Assert
    assert response.status_code == 400
    assert response.json() == {"detail": "LOGIN_BAD_CREDENTIALS"}
    assert "set-cookie" not in response.headers
    assert client.cookies.get("longlink_auth") is None


async def test_registration_completion_accepts_pending_organization_invitation(
    client: AsyncClient,
    captured_mail: list[tuple[str, str, str, str | None]],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Accept an email-bound Organization role while creating a verified account."""

    # Arrange
    email = "invited@example.com"
    organization = await create_organization(users[0])
    async with session_scope() as session:
        await invitations.create(session, organization.id, email, OrganizationRoles.write)
        await session.commit()
    synchronized_organization_ids = capture_synchronized_organization_ids(monkeypatch)
    await register_and_verify(client, captured_mail, email)

    # Act
    response = await client.post("/api/v1/auth/register/complete", json={"name": "Invited User", "password": TEST_PASSWORD})
    organizations_response = await client.get("/api/v1/me/organizations")
    async with session_scope() as session:
        invitation = await session.scalar(select(OrganizationInvitation).where(OrganizationInvitation.organization_id == organization.id))

    # Assert
    assert response.status_code == 201
    assert organizations_response.status_code == 200
    assert organizations_response.json() == [
        {
            "organization": {"id": str(organization.id), "name": "acme", "slug": "acme", "avatar": ""},
            "role": "write",
        }
    ]
    assert invitation is None
    assert synchronized_organization_ids == [organization.id]
    assert client.cookies.get("longlink_auth") is not None


async def test_password_login_accepts_pending_organization_invitation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Accept pending Organization access when an existing user signs in."""

    # Arrange
    owner, invited_user, _ = users
    organization = await create_organization(owner)
    async with session_scope() as session:
        await invitations.create(session, organization.id, invited_user.email, OrganizationRoles.write)
        await session.commit()
    synchronized_organization_ids = capture_synchronized_organization_ids(monkeypatch)

    # Act
    response = await clients[1].post(
        "/api/v1/auth/password/login",
        json={"email": invited_user.email, "password": TEST_PASSWORD},
    )
    async with session_scope() as session:
        invitation = await session.scalar(select(OrganizationInvitation).where(OrganizationInvitation.organization_id == organization.id))
        membership = await session.scalar(
            select(UserOrganization).where(
                UserOrganization.organization_id == organization.id,
                UserOrganization.user_id == invited_user.id,
            )
        )

    # Assert
    assert response.status_code == 204
    assert invitation is None
    assert membership is not None
    assert membership.role == OrganizationRoles.write
    assert synchronized_organization_ids == [organization.id]


async def test_registration_completion_rejects_duplicate_account(
    client: AsyncClient, captured_mail: list[tuple[str, str, str, str | None]]
) -> None:
    """Reject a repeated completion for an existing verified email address."""

    # Arrange
    email = "registered@example.com"
    completion_payload = {"name": "Registered User", "password": TEST_PASSWORD}
    verification_token = await register_and_verify(client, captured_mail, email)
    first_completion = await client.post("/api/v1/auth/register/complete", json=completion_payload)
    assert first_completion.status_code == 201

    # Act
    async with create_client() as repeat_client:
        repeat_verify_response = await repeat_client.post("/api/v1/auth/verify", json={"token": verification_token})
        repeat_response = await repeat_client.post(
            "/api/v1/auth/register/complete",
            json=completion_payload,
        )

    assert repeat_verify_response.status_code == 200
    assert repeat_response.status_code == 409
    assert repeat_response.json() == {"detail": "An account with this email already exists. Sign in or reset your password to continue."}
    assert repeat_client.cookies.get("longlink_auth") is None

async def test_password_reset_setup_rejects_missing_reset_cookie(client: AsyncClient) -> None:
    """Reject reset setup without browser-only reset proof."""

    # Act
    response = await client.get("/api/v1/auth/reset-password/setup")

    # Assert
    assert response.status_code == 400
    assert response.json() == {"detail": "RESET_PASSWORD_BAD_TOKEN"}
    assert "set-cookie" not in response.headers


async def test_password_reset_verify_rejects_invalid_token_without_cookie(client: AsyncClient) -> None:
    """Reject invalid reset proof before creating browser-only state."""

    # Act
    response = await client.post("/api/v1/auth/reset-password/verify", json={"token": "invalid"})

    # Assert
    assert response.status_code == 400
    assert response.json() == {"detail": "RESET_PASSWORD_BAD_TOKEN"}
    assert "set-cookie" not in response.headers
    assert client.cookies.get("longlink_password_reset") is None


async def test_password_reset_rejects_missing_reset_cookie(
    client: AsyncClient,
    users: tuple[User, User, User],
) -> None:
    """Reject password replacement without browser-only reset proof."""

    # Arrange
    user = users[0]

    # Act
    reset_response = await client.post("/api/v1/auth/reset-password", json={"password": "replacement-password"})
    login_response = await client.post(
        "/api/v1/auth/password/login",
        json={"email": user.email, "password": TEST_PASSWORD},
    )

    # Assert
    assert reset_response.status_code == 400
    assert reset_response.json() == {"detail": "RESET_PASSWORD_BAD_TOKEN"}
    assert "set-cookie" not in reset_response.headers
    assert login_response.status_code == 204


async def test_password_reset_verify_sets_secure_browser_only_cookie_in_production(
    client: AsyncClient,
    users: tuple[User, User, User],
    captured_mail: list[tuple[str, str, str, str | None]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Set a restricted secure reset cookie when production verifies reset proof."""

    # Arrange
    user = users[0]
    forgot_response = await client.post("/api/v1/auth/forgot-password", json={"email": user.email})
    reset_token = password_reset_token(captured_mail)
    monkeypatch.setattr(env, "DEVELOPMENT", False)

    # Act
    response = await client.post("/api/v1/auth/reset-password/verify", json={"token": reset_token})

    # Assert
    assert forgot_response.status_code == 202
    assert response.status_code == 204
    assert response.headers["cache-control"] == "no-store"
    cookie = response.headers["set-cookie"]
    assert "longlink_password_reset=" in cookie
    assert "HttpOnly" in cookie
    assert "Max-Age=900" in cookie
    assert "Path=/api/v1/auth/reset-password" in cookie
    assert "SameSite=lax" in cookie
    assert "Secure" in cookie


async def test_forgot_and_reset_password(
    client: AsyncClient, users: tuple[User, User, User], captured_mail: list[tuple[str, str, str, str | None]]
) -> None:
    """Reset a local password with the emailed one-time recovery token."""

    user = users[0]

    # Missing and existing accounts receive the same response, while only the account gets mail.
    missing_response = await client.post("/api/v1/auth/forgot-password", json={"email": "missing@example.com"})
    forgot_response = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": user.email.upper()},
    )

    assert missing_response.status_code == 202
    assert forgot_response.status_code == 202
    assert len(captured_mail) == 1
    assert captured_mail[0][0] == user.email
    reset_url = next(line for line in captured_mail[0][2].splitlines() if line.startswith("http"))
    parsed_reset_url = urlparse(reset_url)
    assert parse_qs(parsed_reset_url.query) == {}

    # Exchange fragment proof for an HTTP-only cookie before replacing the credential.
    reset_token = password_reset_token(captured_mail)
    verify_response = await client.post("/api/v1/auth/reset-password/verify", json={"token": reset_token})
    setup_response = await client.get("/api/v1/auth/reset-password/setup")
    reset_response = await client.post(
        "/api/v1/auth/reset-password",
        json={"password": "replacement-password"},
    )
    reused_token_response = await client.post("/api/v1/auth/reset-password/verify", json={"token": reset_token})
    revoked_session = await client.get("/api/v1/me")
    assert verify_response.status_code == 204
    assert setup_response.status_code == 204
    assert setup_response.headers["cache-control"] == "no-store"
    assert reset_response.status_code == 204
    assert reset_response.headers["cache-control"] == "no-store"
    reset_cookie = reset_response.headers["set-cookie"]
    assert "longlink_password_reset=" in reset_cookie
    assert "Max-Age=0" in reset_cookie
    assert "Path=/api/v1/auth/reset-password" in reset_cookie
    assert reused_token_response.status_code == 400
    assert reused_token_response.json() == {"detail": "RESET_PASSWORD_BAD_TOKEN"}
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


@pytest.mark.parametrize("endpoint", ["/api/v1/auth/forgot-password", "/api/v1/auth/register"])
async def test_password_requests_do_not_send_mail_to_deleted_account(
    client: AsyncClient,
    users: tuple[User, User, User],
    captured_mail: list[tuple[str, str, str, str | None]],
    endpoint: str,
) -> None:
    """Keep deleted accounts indistinguishable from missing request recipients."""

    # Arrange
    user = users[0]
    async with session_scope() as session:
        deleted_user = await session.get(User, user.id)
        assert deleted_user is not None
        deleted_user.deleted_at = utcnow()
        await session.commit()

    # Act
    response = await client.post(endpoint, json={"email": user.email})

    # Assert
    assert response.status_code == 202
    assert captured_mail == []


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


@pytest.mark.parametrize(
    ("public_origin", "origin"),
    [
        pytest.param("http://localhost:5173", "http://127.0.0.1:5173", id="localhost-public"),
        pytest.param("http://127.0.0.1:5173", "http://localhost:5173", id="loopback-public"),
    ],
)
async def test_authenticated_logout_rejects_alternate_local_origin_in_production(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    monkeypatch: pytest.MonkeyPatch,
    public_origin: str,
    origin: str,
) -> None:
    """Reject local development origins when production permits only its public origin."""

    # Arrange
    monkeypatch.setattr(env, "DEVELOPMENT", False)
    monkeypatch.setattr(env, "PUBLIC_URL", public_origin)
    client = clients[0]

    # Act
    response = await client.post("/api/v1/auth/logout", headers={"origin": origin})
    profile_response = await client.get("/api/v1/me")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Origin required"}
    assert "set-cookie" not in response.headers
    assert profile_response.status_code == 200


@pytest.mark.parametrize("headers", [{}, {"origin": "http://localhost:5173"}, {"origin": "http://127.0.0.1:5173"}])
async def test_authenticated_logout_clears_browser_session_for_trusted_origins(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], headers: dict[str, str]
) -> None:
    """Clear browser sessions requested without or from trusted local origins."""

    # Arrange
    client = clients[0]

    # Act
    response = await client.post("/api/v1/auth/logout", headers=headers)
    profile_response = await client.get("/api/v1/me")

    # Assert
    assert response.status_code == 204
    assert "longlink_auth=" in response.headers["set-cookie"]
    assert "HttpOnly" in response.headers["set-cookie"]
    assert "Max-Age=0" in response.headers["set-cookie"]
    assert "Path=/" in response.headers["set-cookie"]
    assert "SameSite=lax" in response.headers["set-cookie"]
    assert profile_response.status_code == 401


async def test_authenticated_logout_uses_secure_cookie_policy_in_production(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Clear the browser session with the production cookie security attributes."""

    # Arrange
    monkeypatch.setattr(env, "DEVELOPMENT", False)
    monkeypatch.setattr(env, "PUBLIC_URL", "https://platform.example")

    # Act
    response = await clients[0].post("/api/v1/auth/logout", headers={"origin": "https://platform.example"})

    # Assert
    assert response.status_code == 204
    cookie = response.headers["set-cookie"]
    assert "longlink_auth=" in cookie
    assert "HttpOnly" in cookie
    assert "Max-Age=0" in cookie
    assert "Path=/" in cookie
    assert "SameSite=lax" in cookie
    assert "Secure" in cookie


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


async def test_deleted_user_cannot_use_existing_browser_session(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject an already-issued session after its user is soft-deleted."""

    # Arrange
    user = users[0]
    async with session_scope() as session:
        persisted = await session.get(User, user.id)
        assert persisted is not None
        persisted.deleted_at = utcnow()
        await session.commit()

    # Act
    response = await clients[0].get("/api/v1/me")

    # Assert
    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}
