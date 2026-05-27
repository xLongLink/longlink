from fastapi.testclient import TestClient

import src.db as db
from src.db.models import User, UserApp
from src.db.session import get_session
from src.models import AppResponse, UserSummary
from src.models.roles import Roles


async def test_list_apps_returns_app_membership_role(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return the app-specific role instead of the organization role."""

    # Arrange
    user = users[0]
    await db.orgs.create("acme", user)
    app = await db.apps.create(
        "acme",
        "dashboard",
        url="/api/apps/dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserApp(
                user_id=user.id,
                organization_name="acme",
                app_name="dashboard",
                role_name=Roles.write,
            )
        )
        await session.commit()

    client = clients[0]

    # Act
    response = client.get("/api/apps?organization=acme")

    # Assert
    assert response.status_code == 200
    expected_data = AppResponse.model_validate(
        {
            **app.model_dump(),
            "role": Roles.write,
            "created_by": UserSummary.model_validate(user.model_dump()),
            "updated_by": UserSummary.model_validate(user.model_dump()),
            "deleted_by": UserSummary.model_validate(user.model_dump()),
        }
    ).model_dump(mode="json")
    assert response.json() == {
        "success": True,
        "detail": "Apps fetched",
        "data": [expected_data],
    }


async def test_list_apps_returns_null_role_without_app_membership(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return no app role when the user has no app membership row."""

    # Arrange
    user = users[0]
    await db.orgs.create("acme", user)
    app = await db.apps.create(
        "acme",
        "dashboard",
        url="/api/apps/dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )
    client = clients[0]

    # Act
    response = client.get("/api/apps?organization=acme")

    # Assert
    assert response.status_code == 200
    expected_data = AppResponse.model_validate(
        {
            **app.model_dump(),
            "role": None,
            "created_by": UserSummary.model_validate(user.model_dump()),
            "updated_by": UserSummary.model_validate(user.model_dump()),
            "deleted_by": UserSummary.model_validate(user.model_dump()),
        }
    ).model_dump(mode="json")
    assert response.json() == {
        "success": True,
        "detail": "Apps fetched",
        "data": [expected_data],
    }


async def test_list_apps_returns_404_for_non_member(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject app listing when the user does not belong to the organization."""

    # Arrange
    owner = users[0]
    await db.orgs.create("acme", owner)
    await db.apps.create("acme", "dashboard", url="/api/apps/dashboard", image="ghcr.io/longlink/dashboard:latest")
    client = clients[1]

    # Act
    response = client.get("/api/apps?organization=acme")

    # Assert
    assert response.status_code == 404
    assert response.json() == {
        "success": False,
        "detail": "Org 'acme' not found",
        "data": None,
    }


async def test_create_app_returns_envelope(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Create an app and return the shared success envelope."""

    # Arrange
    user = users[0]
    await db.orgs.create("acme", user)
    client = clients[0]

    # Act
    response = client.post(
        "/api/apps?organization=acme",
        json={"name": "dashboard", "image": "ghcr.io/longlink/dashboard:latest"},
    )

    # Assert
    assert response.status_code == 200
    payload = response.json()
    expected_data = AppResponse.model_validate(payload["data"]).model_dump(mode="json")
    assert payload["data"]["deleted_by"] == UserSummary.model_validate(user.model_dump()).model_dump(mode="json")
    assert payload == {
        "success": True,
        "detail": "App created",
        "data": expected_data,
    }


async def test_delete_app_removes_dependent_env_rows(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Delete an app even when it still has env secrets."""

    # Arrange
    user = users[0]
    await db.orgs.create("acme", user)
    app = await db.apps.create("acme", "dashboard", url="/api/apps/dashboard", image="ghcr.io/longlink/dashboard:latest")
    await db.envs.set("TOKEN", "secret", "dashboard")
    client = clients[0]

    # Act
    response = client.delete(f"/api/apps/{app.id}?organization=acme")

    # Assert
    assert response.status_code == 204
    assert await db.apps.get("acme", "dashboard") is None
    assert await db.envs.get("TOKEN", "dashboard") is None
