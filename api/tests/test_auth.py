import pytest
from src import auth as auth_module
from uuid import UUID
from types import SimpleNamespace
from src.errors import NotFoundError, ForbiddenError, UnauthorizedError, UnavailableError
from src.routes import auth as auth_routes
from src.routes import users as users_routes
from src.models.auth import OidcUserInfo
from src.models.roles import PlatformRoles
from src.models.users import UserUpdate, UserProfile
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

    async def authorize_access_token(self, request: RequestStub) -> SimpleNamespace:
        """Record authorization-code exchange and return token claims."""

        self.authorize_calls += 1
        return SimpleNamespace(userinfo=self.userinfo, model_dump=lambda mode="python": {})


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
        self.added_user: User | None = None

    async def execute(self, statement) -> FakeSessionResult:
        """Return the configured user count."""

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


def user_profile(profile_user: User) -> UserProfile:
    """Build a user profile for direct route tests."""

    return UserProfile(
        id=profile_user.id,
        name=profile_user.name,
        email=profile_user.email,
        avatar=profile_user.avatar,
        role=profile_user.role,
        theme=profile_user.theme,
        accent=profile_user.accent,
        radius=profile_user.radius,
        language=profile_user.language,
        oidc=profile_user.oidc,
        organizations=[],
    )


async def test_auth_oidc_upserts_activates_and_redirects(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
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
    request = RequestStub({auth_routes.OIDC_NEXT_SESSION_KEY: "/organizations/acme"})

    response = await auth_routes.auth_oidc(request)

    assert response.headers["location"] == "/organizations/acme"
    assert request.session["oidc"] == "callback-subject"
    assert request.session["oidc_accounts"] == ["callback-subject"]
    assert auth_routes.OIDC_NEXT_SESSION_KEY not in request.session
    assert oidc_client.authorize_calls == 1
    assert [userinfo.sub for userinfo in upserts] == ["callback-subject"]


async def test_upsert_oidc_user_syncs_organization_databases(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Upsert normalized provider claims and resync organization shared users."""

    created_user = user("oidc-upsert")
    upsert_calls: list[dict[str, object]] = []
    sync_calls: list[User] = []

    async def fake_upsert(**kwargs) -> User:
        """Record the user upsert payload."""

        upsert_calls.append(kwargs)
        return created_user

    async def fake_sync_user_organizations(synced_user: User) -> None:
        """Record organization database sync requests."""

        sync_calls.append(synced_user)

    monkeypatch.setattr(auth_routes.users, "upsert", fake_upsert)
    monkeypatch.setattr(
        auth_routes.provisioning,
        "sync_user_organizations",
        fake_sync_user_organizations,
    )

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
    assert sync_calls == [created_user]


async def test_upsert_oidc_user_rejects_missing_identity_claims() -> None:
    """Reject provider profiles that cannot create a complete local user."""

    with pytest.raises(UnavailableError, match="returned no email"):
        await auth_routes.upsert_oidc_user(OidcUserInfo(sub="missing-email", name="No Email"))

    with pytest.raises(UnavailableError, match="returned no display name"):
        await auth_routes.upsert_oidc_user(
            OidcUserInfo(sub="missing-name", email="missing@example.com", email_verified=True)
        )

    with pytest.raises(UnauthorizedError, match="unverified email"):
        await auth_routes.upsert_oidc_user(
            OidcUserInfo(sub="unverified-email", email="unverified@example.com", email_verified=False, name="User")
        )


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


async def test_platform_role_dependencies_allow_only_elevated_roles(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Allow support/admin access while rejecting ordinary users."""

    active_user = user("active", PlatformRoles.support)

    async def fake_get(oidc: str) -> User:
        """Return the configured active user."""

        assert oidc == active_user.oidc
        return active_user

    monkeypatch.setattr(auth_module.users, "get", fake_get)

    assert await auth_module.authsupport(RequestStub({"oidc": active_user.oidc})) is active_user

    active_user.role = PlatformRoles.administrator
    assert await auth_module.authsupport(RequestStub({"oidc": active_user.oidc})) is active_user
    assert await auth_module.authadmin(RequestStub({"oidc": active_user.oidc})) is active_user

    active_user.role = PlatformRoles.user
    with pytest.raises(ForbiddenError, match="Support access required"):
        await auth_module.authsupport(RequestStub({"oidc": active_user.oidc}))


async def test_patch_me_updates_profile_and_resyncs_organizations(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Update mutable profile fields and resync shared organization users."""

    current_user = user("patch-user")
    updated_user = user("patch-user")
    updated_user.name = "Updated User"
    profile = user_profile(updated_user)
    upsert_calls: list[dict[str, object]] = []
    sync_calls: list[User] = []

    async def fake_upsert(**kwargs) -> User:
        """Record the profile update payload."""

        upsert_calls.append(kwargs)
        return updated_user

    async def fake_profile(user_id: UUID) -> UserProfile:
        """Return the updated profile."""

        assert user_id == updated_user.id
        return profile

    async def fake_sync_user_organizations(synced_user: User) -> None:
        """Record shared-user sync requests."""

        sync_calls.append(synced_user)

    monkeypatch.setattr(users_routes.users, "upsert", fake_upsert)
    monkeypatch.setattr(users_routes.users, "profile", fake_profile)
    monkeypatch.setattr(
        users_routes.provisioning,
        "sync_user_organizations",
        fake_sync_user_organizations,
    )

    result = await users_routes.patch_me(UserUpdate(name="Updated User"), current_user)

    assert result == profile
    assert upsert_calls == [{"oidc": "patch-user", "name": "Updated User"}]
    assert sync_calls == [updated_user]


async def test_organization_access_hides_missing_memberships(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Return not-found errors for organization non-members."""

    organization_id = UUID("22222222-2222-2222-2222-222222222222")
    current_user = user("member-check")

    async def fake_get_member(organization_id: UUID, user_id: UUID):
        """Return no organization for a missing active membership."""

        assert user_id == current_user.id
        return None

    monkeypatch.setattr(auth_module.organizations, "get_member", fake_get_member)

    with pytest.raises(NotFoundError, match=f"Organization '{organization_id}' not found"):
        await auth_module.organization_access(organization_id, current_user)


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

    async def fake_get(oidc: str, include_deleted: bool = False) -> None:
        """Pretend no user exists yet for the requested OIDC subject."""

        assert include_deleted is True
        return None

    monkeypatch.setattr(users_service_module, "get", fake_get)
    monkeypatch.setattr(users_service_module, "session_scope", lambda: FakeSessionScope(session))

    created_user = await users_service_module.upsert(
        oidc="bootstrap-subject",
        email="bootstrap@example.com",
        name="Bootstrap User",
        role=explicit_role,
    )

    assert created_user.role == expected_role
    assert session.added_user is created_user
