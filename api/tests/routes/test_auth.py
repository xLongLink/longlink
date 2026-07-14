import httpx2
import pytest
from main import app
from fastapi import Request, Response
from conftest import session_cookie
from src.routes import auth as auth_routes
from collections.abc import Mapping
from src.environments import env
from src.models.users import UserProfile, UserListItem
from fastapi.testclient import TestClient
from src.database.services import users as users_service
from src.database.models.users import User
from authlib.integrations.base_client import OAuthError


class OidcClientStub:
    """Capture OIDC authorize calls without contacting Keycloak."""

    def __init__(self) -> None:
        """Store captured authorize calls."""

        self.calls: list[dict[str, object]] = []

    async def authorize_redirect(self, request: Request, redirect_uri: str, **kwargs: object) -> Response:
        """Capture the Authlib redirect arguments and return a test response."""

        self.calls.append(
            {
                "kwargs": kwargs,
                "next_path": request.session.get("oidc_next"),
                "redirect_uri": redirect_uri,
            }
        )
        return Response(status_code=204)


class OidcCallbackClientStub:
    """Return configured token and userinfo values from the OAuth boundary."""

    def __init__(self, token_response: object, userinfo_response: object | None = None) -> None:
        """Store callback responses or exceptions for the OIDC client calls."""

        self.token_response = token_response
        self.userinfo_response = userinfo_response

    async def authorize_access_token(self, request: Request) -> object:
        """Return or raise the configured token exchange result."""

        # Surface provider failures from the mocked external OAuth boundary.
        if isinstance(self.token_response, Exception):
            raise self.token_response

        return self.token_response

    async def userinfo(self, *, token: Mapping[str, object]) -> object:
        """Return or raise the configured userinfo result."""

        # Surface provider failures from the mocked external OAuth boundary.
        if isinstance(self.userinfo_response, Exception):
            raise self.userinfo_response

        return self.userinfo_response


class OAuthStub:
    """Return the test OIDC client from the OAuth registry."""

    def __init__(self, oidc_client: object) -> None:
        """Store the OIDC client stub returned by create_client."""

        self.oidc_client = oidc_client

    def create_client(self, name: str) -> object:
        """Return the configured OIDC test client."""

        assert name == "oidc"
        return self.oidc_client


def test_login_oidc_forwards_social_provider_hint(monkeypatch: pytest.MonkeyPatch) -> None:
    """Pass the selected social provider to Keycloak as an identity-provider hint."""

    # Arrange
    oidc_client = OidcClientStub()
    monkeypatch.setattr(auth_routes, "oauth", OAuthStub(oidc_client))
    client = TestClient(app)

    # Act
    response = client.get("/auth/login/oidc?provider=github&next=/orgs/acme")

    # Assert
    assert response.status_code == 204
    assert oidc_client.calls == [
        {
            "kwargs": {"kc_idp_hint": "github"},
            "next_path": "/orgs/acme",
            "redirect_uri": env.OIDC_REDIRECT_URI,
        }
    ]


@pytest.mark.parametrize(
    ("token_response", "userinfo_response", "expected_status", "expected_detail"),
    [
        (
            OAuthError(error="invalid_grant"),
            None,
            401,
            "OIDC callback could not be validated",
        ),
        (
            httpx2.HTTPStatusError(
                "Provider request failed",
                request=httpx2.Request("POST", "https://identity.example/token"),
                response=httpx2.Response(503),
            ),
            None,
            503,
            "OIDC token exchange failed. Verify provider URL and client credentials.",
        ),
        (
            httpx2.RequestError(
                "Provider is unreachable",
                request=httpx2.Request("POST", "https://identity.example/token"),
            ),
            None,
            503,
            "OIDC token exchange failed. Verify provider URL and client credentials.",
        ),
        (
            "invalid-token-response",
            None,
            503,
            "OIDC provider returned an invalid token response",
        ),
        (
            {},
            httpx2.HTTPStatusError(
                "Provider request failed",
                request=httpx2.Request("GET", "https://identity.example/userinfo"),
                response=httpx2.Response(503),
            ),
            503,
            "OIDC userinfo endpoint failed. Verify provider URL and client credentials.",
        ),
        (
            {},
            httpx2.RequestError(
                "Provider is unreachable",
                request=httpx2.Request("GET", "https://identity.example/userinfo"),
            ),
            503,
            "OIDC userinfo endpoint failed. Verify provider URL and client credentials.",
        ),
        (
            {},
            OAuthError(error="invalid_token"),
            401,
            "OIDC userinfo response could not be validated",
        ),
        (
            {"userinfo": {"email": "malformed@example.com"}},
            None,
            503,
            "Authentication provider returned an invalid user profile",
        ),
        (
            {
                "userinfo": {
                    "sub": "unverified-subject",
                    "email": "unverified@example.com",
                    "email_verified": False,
                    "name": "Unverified User",
                }
            },
            None,
            401,
            "Authentication provider returned an unverified email",
        ),
    ],
)
async def test_auth_oidc_rejects_callback_failures_without_authenticating(
    monkeypatch: pytest.MonkeyPatch,
    token_response: object,
    userinfo_response: object | None,
    expected_status: int,
    expected_detail: str,
) -> None:
    """Map callback failures without creating a user or authenticating the session."""

    # Replace only the external OAuth client while retaining the real route and user service.
    oidc_client = OidcCallbackClientStub(token_response, userinfo_response)
    monkeypatch.setattr(auth_routes, "oauth", OAuthStub(oidc_client))
    client = TestClient(app)
    try:
        response = client.get("/auth/oidc")
        profile_response = client.get("/api/me")
    finally:
        client.close()

    # Every rejected callback must preserve an unauthenticated, empty local state.
    assert response.status_code == expected_status
    assert response.json() == {"detail": expected_detail}
    assert profile_response.status_code == 401
    assert await users_service.fetch() == []


@pytest.mark.parametrize(
    ("next_path", "expected_path"),
    [
        ("/orgs/acme?tab=Apps#top", "/orgs/acme?tab=Apps#top"),
        ("//evil.example", "/organizations"),
        ("///evil.example", "/organizations"),
        ("https://evil.example", "/organizations"),
        ("/\\evil.example", "/organizations"),
        ("settings", "/organizations"),
        (None, "/organizations"),
    ],
)
def test_login_oidc_sanitizes_next_path(monkeypatch: pytest.MonkeyPatch, next_path: str | None, expected_path: str) -> None:
    """Keep post-login redirects constrained to same-origin relative paths."""

    # Arrange
    oidc_client = OidcClientStub()
    monkeypatch.setattr(auth_routes, "oauth", OAuthStub(oidc_client))
    client = TestClient(app)
    params = {"next": next_path} if next_path is not None else {}

    # Act
    response = client.get("/auth/login/oidc", params=params)

    # Assert
    assert response.status_code == 204
    assert oidc_client.calls[0]["next_path"] == expected_path


def test_login_oidc_rejects_unsafe_next_path(monkeypatch: pytest.MonkeyPatch) -> None:
    """Fallback to the default page when an unsafe post-login path is supplied."""

    # Arrange
    oidc_client = OidcClientStub()
    monkeypatch.setattr(auth_routes, "oauth", OAuthStub(oidc_client))
    client = TestClient(app)

    # Act
    response = client.get("/auth/login/oidc?provider=google&next=%2F%2Fevil.example")

    # Assert
    assert response.status_code == 204
    assert oidc_client.calls == [
        {
            "kwargs": {"kc_idp_hint": "google"},
            "next_path": "/organizations",
            "redirect_uri": env.OIDC_REDIRECT_URI,
        }
    ]


@pytest.mark.parametrize("unsafe_next_path", ["%2F%5Cevil.example", "%2Fsafe%0ASet-Cookie%3Aevil"])
def test_login_oidc_rejects_malformed_next_path(monkeypatch: pytest.MonkeyPatch, unsafe_next_path: str) -> None:
    """Fallback to the default page when the next path contains unsafe characters."""

    # Arrange
    oidc_client = OidcClientStub()
    monkeypatch.setattr(auth_routes, "oauth", OAuthStub(oidc_client))
    client = TestClient(app)

    # Act
    response = client.get(f"/auth/login/oidc?next={unsafe_next_path}")

    # Assert
    assert response.status_code == 204
    assert oidc_client.calls == [
        {
            "kwargs": {},
            "next_path": "/organizations",
            "redirect_uri": env.OIDC_REDIRECT_URI,
        }
    ]


async def test_list_accounts_returns_current_active_account(users: tuple[User, User, User]) -> None:
    """Return the saved session accounts for the login screen."""

    # Arrange
    user_one, user_two, _ = users
    client = TestClient(
        app,
        cookies=session_cookie(str(user_two.oidc), [str(user_one.oidc), str(user_two.oidc)]),
    )

    # Act
    response = client.get("/auth/accounts")

    # Assert
    assert response.status_code == 200
    assert response.json() == [
        UserListItem.model_validate(user_one).model_dump(mode="json"),
        UserListItem.model_validate(user_two).model_dump(mode="json"),
    ]


async def test_activate_account_switches_the_active_session_account(users: tuple[User, User, User]) -> None:
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
    assert response.status_code == 204

    accounts_response = client.get("/auth/accounts")
    assert accounts_response.status_code == 200
    assert accounts_response.json() == [
        UserListItem.model_validate(user_one).model_dump(mode="json"),
        UserListItem.model_validate(user_two).model_dump(mode="json"),
    ]

    me_response = client.get("/api/me")
    assert me_response.status_code == 200
    assert me_response.json() == UserProfile.model_validate(user_two).model_dump(mode="json")


async def test_activate_account_rejects_account_not_saved_in_session(users: tuple[User, User, User]) -> None:
    """Reject account switching when the target account was not saved by this browser session."""

    # Arrange
    user_one, user_two, _ = users
    client = TestClient(
        app,
        cookies=session_cookie(str(user_one.oidc), [str(user_one.oidc)]),
    )

    # Act
    response = client.post(f"/auth/accounts/{user_two.oidc}/activate")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Account is not saved in this session"}


async def test_deactivate_account_clears_only_the_active_session_account(users: tuple[User, User, User]) -> None:
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

    accounts_response = client.get("/auth/accounts")
    assert accounts_response.status_code == 200
    assert accounts_response.json() == [
        UserListItem.model_validate(user_one).model_dump(mode="json"),
        UserListItem.model_validate(user_two).model_dump(mode="json"),
    ]

    me_response = client.get("/api/me")
    assert me_response.status_code == 401
