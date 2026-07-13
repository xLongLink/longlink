import pytest
from src import auth as auth_module
from uuid import UUID
from fastapi import HTTPException
from src.routes import auth as auth_routes
from src.routes import users as users_routes
from src.routes import organizations as organizations_routes
from src.models.auth import OidcUserInfo
from src.models.roles import PlatformRoles
from src.models.users import UserUpdate
from src.database.services import users as users_service_module
from src.database.models.users import User

pytestmark = pytest.mark.no_db


class RequestStub:
    """Minimal request object carrying mutable session state."""

    def __init__(self, session: dict[str, object] | None = None) -> None:
        """Store request session data."""

        self.session = session if session is not None else {}


class OidcCallbackClientStub:
    """Return a fixed token payload for callback tests."""

    def __init__(self, userinfo: dict[str, object]) -> None:
        """Store the userinfo payload returned in the token."""

        self.userinfo = userinfo
        self.authorize_calls = 0

    async def authorize_access_token(self, request: RequestStub) -> dict[str, object]:
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


class FakeSessionResult:
    """Minimal scalar result for fake database sessions."""

    def __init__(self, value: object) -> None:
        """Store the scalar value."""

        self.value = value

    def scalar_one(self) -> object:
        """Return exactly one scalar value."""

        return self.value

    def scalar_one_or_none(self) -> object:
        """Return zero-or-one scalar value."""

        return self.value


class FakeSessionScope:
    """Async context manager returning a fake session."""

    def __init__(self, session: object) -> None:
        """Store the fake session."""

        self.session = session

    async def __aenter__(self) -> object:
        """Return the fake session."""

        return self.session

    async def __aexit__(self, exc_type, exc, tb) -> bool:
        """Leave the fake session context."""

        return False


class FakeUserWriteSession:
    """Fake session for testing user upsert role resolution."""

    def __init__(self, user_count: int) -> None:
        """Store existing user count and captured writes."""

        self.user_count = user_count
        self.execute_calls = 0
        self.added_user: User | None = None

    async def execute(self, statement) -> FakeSessionResult:
        """Return no existing user first, then the configured user count."""

        self.execute_calls += 1
        if self.execute_calls == 1:
            return FakeSessionResult(None)

        return FakeSessionResult(self.user_count)

    def add(self, user: User) -> None:
        """Capture the user added to the session."""

        self.added_user = user

    async def commit(self) -> None:
        """Accept the pending fake transaction."""

    async def refresh(self, user: User) -> None:
        """Leave the added user untouched."""


def user(oidc: str = "oidc-user", role: PlatformRoles = PlatformRoles.user) -> User:
    """Build one database user model for direct route tests."""

    return User(
        oidc=oidc,
        email=f"{oidc}@example.com",
        name=f"{oidc} name",
        avatar="",
        role=role,
    )


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
    request = RequestStub({"oidc_next": "/organizations/acme"})

    response = await auth_routes.auth_oidc(request)

    assert response.headers["location"] == "/organizations/acme"
    assert request.session["oidc"] == "callback-subject"
    assert request.session["oidc_accounts"] == ["callback-subject"]
    assert "oidc_next" not in request.session
    assert oidc_client.authorize_calls == 1
    assert [userinfo.sub for userinfo in upserts] == ["callback-subject"]


async def test_upsert_oidc_user_normalizes_provider_claims(monkeypatch: pytest.MonkeyPatch) -> None:
    """Upsert normalized provider claims into the local user record."""

    created_user = user("oidc-upsert")
    upsert_calls: list[dict[str, object]] = []

    async def fake_upsert(**kwargs) -> User:
        """Record the user upsert payload."""

        upsert_calls.append(kwargs)
        return created_user

    monkeypatch.setattr(auth_routes.users, "upsert", fake_upsert)

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

    assert subject == "oidc-upsert"
    assert upsert_calls == [
        {
            "oidc": "oidc-upsert",
            "email": "upsert@example.com",
            "name": "Upsert User",
            "avatar": "https://example.com/avatar.png",
        }
    ]


async def test_upsert_oidc_user_rejects_missing_identity_claims() -> None:
    """Reject provider profiles that cannot create a complete local user."""

    with pytest.raises(HTTPException) as missing_email_error:
        await auth_routes.upsert_oidc_user(OidcUserInfo(sub="missing-email", name="No Email"))

    assert missing_email_error.value.status_code == 503
    assert missing_email_error.value.detail == "Authentication provider returned no email"

    with pytest.raises(HTTPException) as missing_name_error:
        await auth_routes.upsert_oidc_user(OidcUserInfo(sub="missing-name", email="missing@example.com", email_verified=True))

    assert missing_name_error.value.status_code == 503
    assert missing_name_error.value.detail == "Authentication provider returned no display name"

    with pytest.raises(HTTPException) as unverified_email_error:
        await auth_routes.upsert_oidc_user(
            OidcUserInfo(sub="unverified-email", email="unverified@example.com", email_verified=False, name="User")
        )

    assert unverified_email_error.value.status_code == 401
    assert unverified_email_error.value.detail == "Authentication provider returned an unverified email"


def test_session_accounts_activate_deactivate_and_remove() -> None:
    """Manage active and saved browser-session accounts."""

    request = RequestStub({"oidc_accounts": ["first", "second"], "oidc": "first"})
    session_accounts = auth_module.SessionAccountsService(request)

    session_accounts.activate("second")
    assert session_accounts.active() == "second"
    assert session_accounts.list() == ["first", "second"]

    session_accounts.deactivate()
    assert session_accounts.active() is None
    assert session_accounts.list() == ["first", "second"]

    session_accounts.activate("first")
    session_accounts.remove()
    assert session_accounts.active() is None
    assert session_accounts.list() == ["second"]


async def test_platform_role_dependencies_allow_only_elevated_roles(monkeypatch: pytest.MonkeyPatch) -> None:
    """Allow support/admin access while rejecting ordinary users."""

    active_user = user("active", PlatformRoles.support)

    async def fake_get(oidc: str, include_access: bool = False) -> User:
        """Return the configured active user."""

        assert include_access is True
        assert oidc == active_user.oidc
        return active_user

    monkeypatch.setattr(auth_module.users, "get", fake_get)

    assert await auth_module.authsupport(RequestStub({"oidc": active_user.oidc})) is active_user

    active_user.role = PlatformRoles.administrator
    assert await auth_module.authsupport(RequestStub({"oidc": active_user.oidc})) is active_user
    assert await auth_module.authadmin(RequestStub({"oidc": active_user.oidc})) is active_user

    active_user.role = PlatformRoles.user
    with pytest.raises(HTTPException) as exc:
        await auth_module.authsupport(RequestStub({"oidc": active_user.oidc}))

    assert exc.value.status_code == 403
    assert exc.value.detail == "Permission required"


async def test_patch_me_updates_profile(monkeypatch: pytest.MonkeyPatch) -> None:
    """Update mutable profile fields."""

    current_user = user("patch-user")
    updated_user = user("patch-user")
    updated_user.name = "Updated User"
    upsert_calls: list[dict[str, object]] = []

    async def fake_upsert(**kwargs) -> User:
        """Record the profile update payload."""

        upsert_calls.append(kwargs)
        return updated_user

    monkeypatch.setattr(users_routes.users, "upsert", fake_upsert)

    result = await users_routes.patch_me(UserUpdate(name="Updated User"), current_user)

    assert result is updated_user
    assert upsert_calls == [{"oidc": "patch-user", "name": "Updated User"}]


async def test_organization_access_rejects_missing_memberships() -> None:
    """Return access errors for organization non-members."""

    organization_id = UUID("22222222-2222-2222-2222-222222222222")
    current_user = user("member-check")

    with pytest.raises(HTTPException) as exc:
        await organizations_routes.get_organization(organization_id, current_user)

    assert exc.value.status_code == 403
    assert exc.value.detail == "Access required"


@pytest.mark.parametrize(
    ("existing_user_count", "explicit_role", "expected_role"),
    [
        (0, None, PlatformRoles.administrator),
        (0, PlatformRoles.support, PlatformRoles.support),
        (1, None, PlatformRoles.user),
    ],
)
async def test_upsert_bootstraps_first_user_role(
    monkeypatch: pytest.MonkeyPatch,
    existing_user_count: int,
    explicit_role: PlatformRoles | None,
    expected_role: PlatformRoles,
) -> None:
    """Make the first user administrator unless a role is explicitly supplied."""

    session = FakeUserWriteSession(existing_user_count)
    monkeypatch.setattr(users_service_module, "session_scope", lambda: FakeSessionScope(session))

    created_user = await users_service_module.upsert(
        oidc="bootstrap-subject",
        email="bootstrap@example.com",
        name="Bootstrap User",
        role=explicit_role,
    )

    assert created_user.role == expected_role
    assert session.added_user is created_user
