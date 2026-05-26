from fastapi.testclient import TestClient
from sqlalchemy import insert

import src.db as db
from src.db.models.association import user_apps
from src.db.models import User
from src.db.session import get_session


async def test_list_apps_returns_app_membership_role(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return the app-specific role instead of the organization role."""

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
                role_name="write",
            )
        )
        await session.commit()

    client = clients[0]

    # Act
    response = client.get("/api/apps?organization=acme")

    # Assert
    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "message": "Apps fetched",
        "data": [
            {
                "name": "dashboard",
                "url": "/api/apps/dashboard",
                "role": "write",
            }
        ],
    }


async def test_list_apps_returns_null_role_without_app_membership(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return no app role when the user has no app membership row."""

    # Arrange
    user = users[0]
    await db.orgs.create("acme", user.id)
    await db.apps.create("acme", "dashboard", url="/api/apps/dashboard", image="ghcr.io/longlink/dashboard:latest")
    client = clients[0]

    # Act
    response = client.get("/api/apps?organization=acme")

    # Assert
    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "message": "Apps fetched",
        "data": [
            {
                "name": "dashboard",
                "url": "/api/apps/dashboard",
                "role": None,
            }
        ],
    }


async def test_list_apps_returns_404_for_non_member(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject app listing when the user does not belong to the organization."""

    # Arrange
    owner = users[0]
    await db.orgs.create("acme", owner.id)
    await db.apps.create("acme", "dashboard", url="/api/apps/dashboard", image="ghcr.io/longlink/dashboard:latest")
    client = clients[1]

    # Act
    response = client.get("/api/apps?organization=acme")

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Org 'acme' not found"}


async def test_create_app_returns_envelope(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Create an app and return the shared success envelope."""

    # Arrange
    user = users[0]
    await db.orgs.create("acme", user.id)
    client = clients[0]

    # Act
    response = client.post(
        "/api/apps?organization=acme",
        json={"name": "dashboard", "image": "ghcr.io/longlink/dashboard:latest"},
    )

    # Assert
    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "message": "App created",
        "data": {
            "name": "dashboard",
            "url": "/api/apps/dashboard",
            "role": None,
        },
    }
