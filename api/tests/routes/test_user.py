from fastapi.testclient import TestClient
import src.db as db
from src.db.models import User


async def test_get_me_returns_authenticated_user_profile_and_org_memberships(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return the authenticated user's profile with organization memberships."""

    # Arrange
    user = users[0]
    await db.orgs.create("acme", user.id)

    client = clients[0]

    # Act
    response = client.get("/api/me")

    # Assert
    assert response.status_code == 200

    expected_payload = user.model_dump(mode="json")
    expected_payload["orgs"] = [{"name": "acme", "role": "owner"}]
    assert response.json() == {
        "success": True,
        "message": "User profile fetched",
        "data": expected_payload,
    }


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

    expected_payload = updated_profile.model_dump(mode="json")
    expected_payload["orgs"] = []
    assert response.json() == {
        "success": True,
        "message": "User profile updated",
        "data": expected_payload,
    }
