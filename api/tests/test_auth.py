import pytest
from fastapi import Request, HTTPException
from src.routes import auth as auth_routes
from src.models.auth import OidcUserInfo
from src.database.models.users import User

pytestmark = pytest.mark.no_db


class OidcCallbackClientStub:
    """Return a fixed token payload for callback tests."""

    def __init__(self, userinfo: dict[str, object]) -> None:
        """Store the userinfo payload returned in the token."""

        self.userinfo = userinfo
        self.authorize_calls = 0

    async def authorize_access_token(self, request: Request) -> dict[str, object]:
        """Record authorization-code exchange and return token claims."""

        self.authorize_calls += 1
        return {"userinfo": self.userinfo}


class OAuthStub:
    """Return the configured OIDC test client."""

    def __init__(self, oidc_client: object) -> None:
        """Store the client returned for the oidc provider."""

        self.oidc_client = oidc_client

    def create_client(self, name: str) -> object:
        """Return the stub client for the requested provider name."""

        assert name == "oidc"
        return self.oidc_client


async def test_auth_oidc_upserts_activates_and_redirects(monkeypatch: pytest.MonkeyPatch) -> None:
    """Complete OIDC callback by validating userinfo and activating the account."""

    oidc_client = OidcCallbackClientStub(
        {
            "sub": "callback-subject",
            "email": "callback@example.com",
            "email_verified": True,
            "name": "Callback User",
        }
    )
    upserts: list[OidcUserInfo] = []

    async def fake_upsert_oidc_user(userinfo: OidcUserInfo) -> str:
        """Record validated userinfo and return the session subject."""

        upserts.append(userinfo)
        return userinfo.sub

    monkeypatch.setattr(auth_routes, "oauth", OAuthStub(oidc_client))
    monkeypatch.setattr(auth_routes, "upsert_oidc_user", fake_upsert_oidc_user)
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/auth/oidc",
            "headers": [],
            "query_string": b"",
            "session": {"oidc_next": "/organizations/acme"},
        }
    )

    response = await auth_routes.auth_oidc(request)

    assert response.headers["location"] == "/organizations/acme"
    assert request.session["oidc"] == "callback-subject"
    assert request.session["oidc_accounts"] == ["callback-subject"]
    assert "oidc_next" not in request.session
    assert oidc_client.authorize_calls == 1
    assert [userinfo.sub for userinfo in upserts] == ["callback-subject"]


async def test_upsert_oidc_user_normalizes_provider_claims(monkeypatch: pytest.MonkeyPatch) -> None:
    """Upsert normalized provider claims into the local user record."""

    # Arrange
    created_user = User(
        oidc="oidc-upsert",
        email="oidc-upsert@example.com",
        name="oidc-upsert name",
        avatar="",
    )
    upsert_calls: list[dict[str, object]] = []

    async def fake_upsert(*, oidc: str, email: str | None = None, name: str | None = None, avatar: str | None = None) -> User:
        """Record the user upsert payload."""

        upsert_calls.append({"oidc": oidc, "email": email, "name": name, "avatar": avatar})
        return created_user

    monkeypatch.setattr(auth_routes.users, "upsert", fake_upsert)

    # Act
    subject = await auth_routes.upsert_oidc_user(
        OidcUserInfo(
            sub="oidc-upsert",
            email="upsert@example.com",
            email_verified=True,
            given_name="Upsert",
            family_name="User",
            picture="https://example.com/avatar.png",
        )
    )

    # Assert
    assert subject == "oidc-upsert"
    assert upsert_calls == [
        {
            "oidc": "oidc-upsert",
            "email": "upsert@example.com",
            "name": "Upsert User",
            "avatar": "https://example.com/avatar.png",
        }
    ]


@pytest.mark.parametrize(
    ("userinfo", "expected_status", "expected_detail"),
    [
        pytest.param(
            OidcUserInfo(sub="missing-email", name="No Email"),
            503,
            "Authentication provider returned no email",
            id="missing-email",
        ),
        pytest.param(
            OidcUserInfo(sub="missing-name", email="missing@example.com", email_verified=True),
            503,
            "Authentication provider returned no display name",
            id="missing-name",
        ),
        pytest.param(
            OidcUserInfo(sub="unverified-email", email="unverified@example.com", email_verified=False, name="User"),
            401,
            "Authentication provider returned an unverified email",
            id="unverified-email",
        ),
    ],
)
async def test_upsert_oidc_user_rejects_missing_identity_claims(
    userinfo: OidcUserInfo,
    expected_status: int,
    expected_detail: str,
) -> None:
    """Reject provider profiles that cannot create a complete local user."""

    # Act
    with pytest.raises(HTTPException) as exc:
        await auth_routes.upsert_oidc_user(userinfo)

    # Assert
    assert exc.value.status_code == expected_status
    assert exc.value.detail == expected_detail
