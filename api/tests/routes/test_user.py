import src.db as db
from src.models import UserProfile, UserListItem
from src.db.models import User
from fastapi.testclient import TestClient


async def test_get_me_returns_authenticated_user_profile_and_org_memberships(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return the authenticated user's profile with organization memberships."""

    # Arrange
    user = users[0]
    location = await db.locations.create("local", "Local testing")
    await db.orgs.create("acme", location.id, user)

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
    location = await db.locations.create("local", "Local testing")
    await db.orgs.create("acme", location.id, user)

    client = clients[0]

    # Act
    response = client.get("/api/users")

    # Assert
    assert response.status_code == 200

    expected_payload = [UserListItem.model_validate(user.model_dump()).model_dump(mode="json") for user in users]
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
