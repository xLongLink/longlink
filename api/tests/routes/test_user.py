from fastapi.testclient import TestClient
from sqlalchemy import insert

import src.db as db
from src.db.models.association import user_apps
from src.db.models import User
from src.db.session import get_session


async def test_get_me_returns_authenticated_user_profile_and_org_memberships(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return the authenticated user's profile with organization and app memberships."""

    # Arrange
    user = users[0]
    await db.orgs.create("acme", user.id)
    await db.apps.create("acme", "dashboard", url="/api/apps/dashboard", image="ghcr.io/longlink/dashboard:latest")

    Session = await get_session()
    async with Session() as session:
        await session.execute(
            insert(user_apps).values(
                user_id=user.id,
                organization_name="acme",
                app_name="dashboard",
                role_name="read",
            )
        )
        await session.commit()

    client = clients[0]

    # Act
    response = client.get("/api/me")

    # Assert
    assert response.status_code == 200

    expected_payload = user.model_dump(mode="json")
    expected_payload["orgs"] = [{"name": "acme", "role": "owner"}]
    expected_payload["apps"] = [
        {"organization": "acme", "name": "dashboard", "role": "read"},
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

    updated_user = await db.users.get(user.id)
    assert updated_user is not None

    expected_payload = updated_user.model_dump(mode="json")
    expected_payload["orgs"] = []
    expected_payload["apps"] = []
    assert response.json() == expected_payload
