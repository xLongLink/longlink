from main import app
from types import SimpleNamespace
from conftest import session_cookie
from src.models.roles import PlatformRoles
from src.models.users import UserProfile, UserListItem
from fastapi.testclient import TestClient
from src.database.services import users, compute, storage, database, locations, operations, applications, organizations
from src.database.models.users import User

db = SimpleNamespace(
    applications=applications,
    compute=compute,
    database=database,
    locations=locations,
    operations=operations,
    organizations=organizations,
    storage=storage,
    users=users,
)


async def test_get_me_returns_authenticated_user_profile_and_separate_org_memberships(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return profile and organization memberships from separate endpoints."""

    # Arrange
    user = users[0]
    location = await db.locations.create("local", "Local testing", user, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, user, avatar="https://example.com/organizations/acme.png")
    client = clients[0]

    # Act
    profile_response = client.get("/api/me")
    organizations_response = client.get("/api/me/organizations")

    # Assert
    assert profile_response.status_code == 200
    assert profile_response.json() == UserProfile.model_validate(user).model_dump(mode="json")
    assert "organizations" not in profile_response.json()

    assert organizations_response.status_code == 200
    assert organizations_response.json() == [
        {
            "id": str(organization.id),
            "name": "acme",
            "slug": "acme",
            "avatar": "https://example.com/organizations/acme.png",
            "country": "CH",
            "location": {
                "id": str(location.id),
                "name": "Local testing",
                "slug": "local",
                "country": "CH",
                "provider": "local",
            },
            "role": "owner",
        }
    ]


async def test_logout_clears_the_active_account(users: tuple[User, User, User]) -> None:
    """Clear the active account from the session."""

    # Arrange
    user_one, _, _ = users
    client = TestClient(app, cookies=session_cookie(str(user_one.oidc)))

    # Act
    response = client.post("/auth/logout")

    # Assert
    assert response.status_code == 204

    accounts_response = client.get("/auth/accounts")
    assert accounts_response.status_code == 200
    assert accounts_response.json() == []

    me_response = client.get("/api/me")
    assert me_response.status_code == 401


async def test_list_users_returns_admin_user_summaries(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return all user summaries from the `/api/users` admin route."""

    # Arrange
    user = users[0]
    location = await db.locations.create("local", "Local testing", user, "CH")
    await db.organizations.create("acme", "acme", location.id, user)

    client = clients[0]

    # Act
    response = client.get("/api/users")

    # Assert
    assert response.status_code == 200

    expected_payload = [UserListItem.model_validate(user).model_dump(mode="json") for user in users]
    assert response.json() == expected_payload


async def test_platform_roles_separate_support_reads_from_admin_mutations(
    clients: tuple[TestClient, TestClient, TestClient],
) -> None:
    """Allow support reads while denying support mutations and ordinary-user support access."""

    # Create a dedicated support account without changing the shared user fixture roles.
    support = await db.users.upsert(
        oidc="oidc-support",
        email="support@example.com",
        name="Support User",
        role=PlatformRoles.support,
    )
    support_client = TestClient(app, cookies=session_cookie(str(support.oidc)))
    ordinary_client = clients[1]

    # Exercise representative support and administrator route dependencies.
    support_read_response = support_client.get("/api/users")
    ordinary_read_response = ordinary_client.get("/api/users")
    support_mutation_response = support_client.post(
        "/api/locations",
        json={"name": "Support location", "country": "CH"},
    )

    # Verify support can read but neither support nor ordinary users receive excess privileges.
    assert support_read_response.status_code == 200
    assert str(support.id) in {item["id"] for item in support_read_response.json()}
    assert ordinary_read_response.status_code == 403
    assert ordinary_read_response.json() == {"detail": "Permission required"}
    assert support_mutation_response.status_code == 403
    assert support_mutation_response.json() == {"detail": "Permission required"}


async def test_patch_me_updates_authenticated_user_profile(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Update the authenticated user's mutable profile fields."""

    # Arrange
    user = users[0]
    client = clients[0]

    # Act
    response = client.patch("/api/me", json={"name": "Updated User"})

    # Assert
    assert response.status_code == 200

    updated_user = await db.users.get(user.oidc)
    assert updated_user is not None

    expected_payload = UserProfile.model_validate(updated_user).model_dump(mode="json")
    assert response.json() == expected_payload
