import pytest
from src import auth as auth_module
from uuid import UUID
from types import SimpleNamespace
from fastapi import Response
from src.errors import NotFoundError, ForbiddenError, UnavailableError
from src.routes import auth as auth_routes
from src.routes import users as users_routes
from src.routes import accounts as account_routes
from src.models.auth import OidcUserInfo
from src.models.roles import PlatformRoles, ApplicationRoles, OrganizationRoles
from src.models.users import UserUpdate, UserProfile, UserListItem
from src.models.common import SuccessResponse
from src.models.countries import Country
from src.models.locations import LocationProvider, LocationResponse
from src.database.services import users as users_service_module
from src.database.models.users import User

pytestmark = pytest.mark.no_db


class RequestStub:
    """Minimal request object carrying mutable session state."""

    def __init__(self, session: dict[str, object] | None = None) -> None:
        """Store request session data."""

        self.session = session if session is not None else {}


class OidcRedirectClientStub:
    """Capture OIDC redirect requests."""

    def __init__(self) -> None:
        """Initialize captured redirect calls."""

        self.calls: list[dict[str, object]] = []

    async def authorize_redirect(self, request: RequestStub, redirect_uri: str, **kwargs: object) -> Response:
        """Record redirect arguments and return a plain response."""

        self.calls.append(
            {
                "kwargs": kwargs,
                "next_path": request.session.get(auth_routes.OIDC_NEXT_SESSION_KEY),
                "redirect_uri": redirect_uri,
            }
        )
        return Response(status_code=204)


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


class FakeHttpResponse:
    """Minimal HTTP response returned by the password login client."""

    def __init__(self, payload: dict[str, object], status_code: int = 200) -> None:
        """Store response payload and status."""

        self._payload = payload
        self.status_code = status_code

    def json(self) -> dict[str, object]:
        """Return the configured JSON payload."""

        return self._payload

    def raise_for_status(self) -> None:
        """Treat all configured fake responses as successful."""


class PasswordLoginHttpClientStub:
    """Fake async HTTP client for the password grant flow."""

    posts: list[tuple[str, dict[str, object]]] = []
    gets: list[tuple[str, dict[str, str] | None]] = []

    async def __aenter__(self) -> PasswordLoginHttpClientStub:
        """Enter the fake async client context."""

        return self

    async def __aexit__(self, exc_type, exc, tb) -> bool:
        """Exit the fake async client context."""

        return False

    async def get(self, url: str, headers: dict[str, str] | None = None) -> FakeHttpResponse:
        """Return metadata or userinfo responses based on URL."""

        self.gets.append((url, headers))
        if url.endswith("/.well-known/openid-configuration"):
            return FakeHttpResponse(
                {
                    "token_endpoint": "https://identity.example/token",
                    "userinfo_endpoint": "https://identity.example/userinfo",
                }
            )

        assert url == "https://identity.example/userinfo"
        assert headers == {"Authorization": "Bearer access-token"}
        return FakeHttpResponse(
            {
                "sub": "password-subject",
                "email": "password@example.com",
                "name": "Password User",
            }
        )

    async def post(self, url: str, data: dict[str, object]) -> FakeHttpResponse:
        """Return an access token for the password grant."""

        self.posts.append((url, data))
        return FakeHttpResponse({"access_token": "access-token", "token_type": "Bearer"})


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


def location_response() -> LocationResponse:
    """Build one location response for profile tests."""

    return LocationResponse(
        id=UUID("11111111-1111-1111-1111-111111111111"),
        name="local",
        slug="local",
        country=Country.CH,
        provider=LocationProvider.local,
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


async def test_login_oidc_stores_safe_next_path_and_provider_hint(monkeypatch: pytest.MonkeyPatch) -> None:
    """Start OIDC login with safe redirect storage and Keycloak provider hints."""

    oidc_client = OidcRedirectClientStub()
    monkeypatch.setattr(auth_routes, "oauth", OAuthStub(oidc_client))
    request = RequestStub()

    response = await auth_routes.login_oidc(request, provider="github", next_path="/orgs/acme")

    assert response.status_code == 204
    assert oidc_client.calls == [
        {
            "kwargs": {"kc_idp_hint": "github"},
            "next_path": "/orgs/acme",
            "redirect_uri": auth_routes.env.OIDC_REDIRECT_URI,
        }
    ]


async def test_auth_oidc_upserts_activates_and_redirects(monkeypatch: pytest.MonkeyPatch) -> None:
    """Complete OIDC callback by validating userinfo and activating the account."""

    oidc_client = OidcCallbackClientStub(
        {
            "sub": "callback-subject",
            "email": "callback@example.com",
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


async def test_upsert_oidc_user_syncs_organization_databases(monkeypatch: pytest.MonkeyPatch) -> None:
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
    monkeypatch.setattr(auth_routes.provisioning, "sync_user_organizations", fake_sync_user_organizations)

    subject = await auth_routes.upsert_oidc_user(
        OidcUserInfo(
            sub="oidc-upsert",
            email="upsert@example.com",
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
        await auth_routes.upsert_oidc_user(OidcUserInfo(sub="missing-name", email="missing@example.com"))


async def test_login_password_uses_provider_password_grant(monkeypatch: pytest.MonkeyPatch) -> None:
    """Log in with the OIDC password grant, userinfo fetch, user sync, and session activation."""

    PasswordLoginHttpClientStub.posts = []
    PasswordLoginHttpClientStub.gets = []
    upserts: list[OidcUserInfo] = []

    async def fake_upsert_oidc_user(userinfo: OidcUserInfo) -> str:
        """Record validated userinfo and return the session subject."""

        upserts.append(userinfo)
        return userinfo.sub

    monkeypatch.setattr(auth_routes.httpx2, "AsyncClient", PasswordLoginHttpClientStub)
    monkeypatch.setattr(auth_routes, "upsert_oidc_user", fake_upsert_oidc_user)
    request = RequestStub()

    response = await auth_routes.login_password(
        request,
        auth_routes.PasswordLoginRequest(username="admin", password="admin"),
    )

    assert response.status_code == 204
    assert request.session["oidc"] == "password-subject"
    assert request.session["oidc_accounts"] == ["password-subject"]
    assert PasswordLoginHttpClientStub.posts == [
        (
            "https://identity.example/token",
            {
                "grant_type": "password",
                "client_id": auth_routes.env.OIDC_CLIENT_ID,
                "client_secret": auth_routes.env.OIDC_CLIENT_SECRET,
                "username": "admin",
                "password": "admin",
                "scope": "openid profile email",
            },
        )
    ]
    assert [userinfo.sub for userinfo in upserts] == ["password-subject"]


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


async def test_account_routes_list_activate_and_deactivate(monkeypatch: pytest.MonkeyPatch) -> None:
    """List saved accounts, activate a saved account, and clear the active account."""

    first_user = user("first")
    second_user = user("second")
    users_by_oidc = {first_user.oidc: first_user, second_user.oidc: second_user}

    async def fake_get(oidc: str) -> User | None:
        """Return users by OIDC subject."""

        return users_by_oidc.get(oidc)

    monkeypatch.setattr(account_routes.users, "get", fake_get)
    request = RequestStub({"oidc_accounts": ["first", "missing", "second"], "oidc": "first"})

    listed = await account_routes.list_accounts(request)
    assert listed == [UserListItem.model_validate(first_user), UserListItem.model_validate(second_user)]

    activated = await account_routes.activate_account("second", request)
    assert activated == SuccessResponse()
    assert request.session["oidc"] == "second"

    deactivated = await account_routes.deactivate_account(request)
    assert deactivated == [UserListItem.model_validate(first_user), UserListItem.model_validate(second_user)]
    assert "oidc" not in request.session


async def test_activate_account_rejects_unsaved_subject() -> None:
    """Reject activating accounts that were not saved in the browser session."""

    request = RequestStub({"oidc_accounts": ["first"], "oidc": "first"})

    with pytest.raises(ForbiddenError, match="Account is not saved in this session"):
        await account_routes.activate_account("second", request)


async def test_logout_removes_active_session_account() -> None:
    """Remove the active account from the browser session."""

    request = RequestStub({"oidc_accounts": ["first", "second"], "oidc": "first"})

    response = await auth_routes.logout(request)

    assert response == SuccessResponse()
    assert request.session == {"oidc_accounts": ["second"]}


async def test_current_profile_and_listing_routes_use_user_services(monkeypatch: pytest.MonkeyPatch) -> None:
    """Return current profile and support user listings through the user service."""

    current_user = user("current", PlatformRoles.administrator)
    profile = user_profile(current_user)
    listed_user = user("listed")

    async def fake_profile(user_id: UUID) -> UserProfile:
        """Return the configured current profile."""

        assert user_id == current_user.id
        return profile

    async def fake_list() -> list[User]:
        """Return all users for the listing route."""

        return [listed_user]

    monkeypatch.setattr(users_routes.users, "profile", fake_profile)
    monkeypatch.setattr(users_routes.users, "list", fake_list)

    assert await users_routes.get_me(current_user) == profile
    assert await users_routes.list_users(current_user) == [UserListItem.model_validate(listed_user)]


async def test_platform_role_dependencies_allow_only_elevated_roles(monkeypatch: pytest.MonkeyPatch) -> None:
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


async def test_patch_me_updates_profile_and_resyncs_organizations(monkeypatch: pytest.MonkeyPatch) -> None:
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
    monkeypatch.setattr(users_routes.provisioning, "sync_user_organizations", fake_sync_user_organizations)

    result = await users_routes.patch_me(UserUpdate(name="Updated User"), current_user)

    assert result == profile
    assert upsert_calls == [{"oidc": "patch-user", "name": "Updated User"}]
    assert sync_calls == [updated_user]


def test_role_model_defines_platform_organization_and_application_roles() -> None:
    """Expose the supported role values used by access checks."""

    assert [role.value for role in PlatformRoles] == ["user", "support", "administrator"]
    assert [role.value for role in OrganizationRoles] == ["read", "write", "maintain", "admin", "owner"]
    assert [role.value for role in ApplicationRoles] == ["read", "write", "maintain", "admin"]


async def test_organization_access_hides_missing_memberships(monkeypatch: pytest.MonkeyPatch) -> None:
    """Return not-found errors for organization non-members."""

    organization_id = UUID("22222222-2222-2222-2222-222222222222")
    current_user = user("member-check")

    async def fake_get(organization_id: UUID, application_user_id: UUID):
        """Return an organization visible before the membership privacy check."""

        return SimpleNamespace(id=organization_id, slug="acme")

    class FakeMembershipSession:
        async def execute(self, statement) -> FakeSessionResult:
            """Return no active membership."""

            return FakeSessionResult(None)

    monkeypatch.setattr(auth_module.organizations, "get", fake_get)
    monkeypatch.setattr(auth_module, "session_scope", lambda: FakeSessionScope(FakeMembershipSession()))

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

    service = users_service_module.UsersService()
    session = FakeUserWriteSession(existing_user_count)

    async def fake_get(oidc: str) -> None:
        """Pretend no user exists yet for the requested OIDC subject."""

        return None

    monkeypatch.setattr(service, "get", fake_get)
    monkeypatch.setattr(users_service_module, "session_scope", lambda: FakeSessionScope(session))

    created_user = await service.upsert(
        oidc="bootstrap-subject",
        email="bootstrap@example.com",
        name="Bootstrap User",
        role=explicit_role,
    )

    assert created_user.role == expected_role
    assert session.added_user is created_user
