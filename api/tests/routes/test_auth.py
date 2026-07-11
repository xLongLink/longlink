import pytest
from main import app
from fastapi import Request, Response
from conftest import session_cookie
from src.routes import auth as auth_routes
from src.environments import env
from src.models.users import UserProfile, UserListItem
from fastapi.testclient import TestClient
from src.database.models.users import User
from src.routes.users import user_profile_payload
from src.database.services import users as users_service


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
                "next_path": request.session.get(auth_routes.OIDC_NEXT_SESSION_KEY),
                "redirect_uri": redirect_uri,
            }
        )
        return Response(status_code=204)


class OAuthStub:
    """Return the test OIDC client from the OAuth registry."""

    def __init__(self, oidc_client: OidcClientStub) -> None:
        """Store the OIDC client stub returned by create_client."""

        self.oidc_client = oidc_client

    def create_client(self, name: str) -> OidcClientStub:
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
    ("next_path", "expected_path"),
    [
        ("/orgs/acme?tab=Apps#top", "/orgs/acme?tab=Apps#top"),
        ("//evil.example", auth_routes.DEFAULT_POST_LOGIN_REDIRECT),
        ("///evil.example", auth_routes.DEFAULT_POST_LOGIN_REDIRECT),
        ("https://evil.example", auth_routes.DEFAULT_POST_LOGIN_REDIRECT),
        ("/\\evil.example", auth_routes.DEFAULT_POST_LOGIN_REDIRECT),
        ("settings", auth_routes.DEFAULT_POST_LOGIN_REDIRECT),
        (None, auth_routes.DEFAULT_POST_LOGIN_REDIRECT),
    ],
)
def test_sanitize_post_login_redirect(next_path: str | None, expected_path: str) -> None:
    """Keep post-login redirects constrained to same-origin relative paths."""

    assert auth_routes.sanitize_post_login_redirect(next_path) == expected_path


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
            "next_path": auth_routes.DEFAULT_POST_LOGIN_REDIRECT,
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
            "next_path": auth_routes.DEFAULT_POST_LOGIN_REDIRECT,
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
    assert response.status_code == 200

    accounts_response = client.get("/auth/accounts")
    assert accounts_response.status_code == 200
    assert accounts_response.json() == [
        UserListItem.model_validate(user_one).model_dump(mode="json"),
        UserListItem.model_validate(user_two).model_dump(mode="json"),
    ]

    me_response = client.get("/api/me")
    assert me_response.status_code == 200
    current_profile = await users_service.profile(user_two.id)
    assert current_profile is not None
    assert me_response.json() == UserProfile.model_validate(user_profile_payload(current_profile)).model_dump(mode="json")


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
