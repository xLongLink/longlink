from types import SimpleNamespace
from src.database.models.users import User
from src.database.services.applications import applications as apps
from src.database.services.compute import compute
from src.database.services.database import database
from src.database.services.locations import locations
from src.database.services.operations import operations
from src.database.services.organizations import organizations as orgs
from src.database.services.storage import storage
from src.database.services.users import users
from src.models.roles import PlatformRole
from fastapi.testclient import TestClient
from src.models.users import UserProfile, UserListItem

db = SimpleNamespace(
    apps=apps,
    compute=compute,
    database=database,
    locations=locations,
    operations=operations,
    orgs=orgs,
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
    location = await db.locations.create("local", "Local testing", user)
    await db.orgs.create("acme", location.id, user, avatar="https://example.com/organizations/acme.png")

    client = clients[0]

    # Act
    response = client.get("/api/me")

    # Assert
    assert response.status_code == 200

    profile = await db.users.profile(user.id)
    assert profile is not None

    expected_payload = UserProfile.model_validate(profile.model_dump()).model_dump(mode="json")
    assert response.json() == expected_payload


async def test_list_users_returns_admin_user_summaries(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return all user summaries from the `/api/users` admin route."""

    # Arrange
    user = users[0]
    location = await db.locations.create("local", "Local testing", user)
    await db.orgs.create("acme", location.id, user)

    client = clients[0]

    # Act
    response = client.get("/api/users")

    # Assert
    assert response.status_code == 200

    expected_payload = [
        UserListItem.model_validate({**user.model_dump(), "admin": user.role == PlatformRole.administrator}).model_dump(mode="json")
        for user in users
    ]
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
