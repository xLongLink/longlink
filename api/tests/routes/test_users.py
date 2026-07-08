from main import app
from types import SimpleNamespace
from conftest import session_cookie
from src.models.users import UserProfile, UserListItem
from fastapi.testclient import TestClient
from src.database.models.users import User
from src.database.services import users
from src.database.services import compute
from src.database.services import storage
from src.database.services import database
from src.database.services import locations
from src.database.services import operations
from src.database.services import applications
from src.database.services import organizations

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


async def test_get_me_returns_authenticated_user_profile_and_org_memberships(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return the authenticated user's profile with organization memberships."""

    # Arrange
    user = users[0]
    location = await db.locations.create("local", "Local testing", user, "CH")
    await db.organizations.create("acme", "acme", location.id, user, avatar="https://example.com/organizations/acme.png")

    client = clients[0]

    # Act
    response = client.get("/api/me")

    # Assert
    assert response.status_code == 200

    profile = await db.users.profile(user.id)
    assert profile is not None

    expected_payload = UserProfile.model_validate(profile.model_dump()).model_dump(mode="json")
    assert response.json() == expected_payload
    assert response.json()["organizations"][0]["slug"] == "acme"


async def test_get_me_returns_the_active_account_profile(
    users: tuple[User, User, User],
) -> None:
    """Return the active account profile for the session."""

    # Arrange
    user_one, _, _ = users
    client = TestClient(app, cookies=session_cookie(str(user_one.oidc)))

    # Act
    response = client.get("/api/me")

    # Assert
    assert response.status_code == 200

    current_profile = await db.users.profile(user_one.id)
    assert current_profile is not None

    assert response.json() == UserProfile.model_validate(current_profile.model_dump()).model_dump(mode="json")


async def test_logout_clears_the_active_account(
    users: tuple[User, User, User],
) -> None:
    """Clear the active account from the session."""

    # Arrange
    user_one, _, _ = users
    client = TestClient(app, cookies=session_cookie(str(user_one.oidc)))

    # Act
    response = client.post("/auth/logout")

    # Assert
    assert response.status_code == 200

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

    updated_profile = await db.users.profile(user.id)
    assert updated_profile is not None

    expected_payload = UserProfile.model_validate(updated_profile.model_dump()).model_dump(mode="json")
    assert response.json() == expected_payload
