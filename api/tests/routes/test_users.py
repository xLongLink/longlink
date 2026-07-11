from main import app
from types import SimpleNamespace
from conftest import session_cookie
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


async def test_get_me_returns_the_active_account_profile(users: tuple[User, User, User]) -> None:
    """Return the active account profile for the session."""

    # Arrange
    user_one, _, _ = users
    client = TestClient(app, cookies=session_cookie(str(user_one.oidc)))

    # Act
    response = client.get("/api/me")

    # Assert
    assert response.status_code == 200

    assert response.json() == UserProfile.model_validate(user_one).model_dump(mode="json")


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

    updated_user = await db.users.get_by_id(user.id)
    assert updated_user is not None

    expected_payload = UserProfile.model_validate(updated_user).model_dump(mode="json")
    assert response.json() == expected_payload
