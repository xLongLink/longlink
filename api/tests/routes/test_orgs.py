from fastapi.testclient import TestClient

import src.db as db
from src.db.models import User
from src.models import OrgDetails, UserSummary


async def test_create_organization_returns_owner_role(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Create a new organization and return the owner role in the payload."""

    # Arrange
    user = users[0]
    client = clients[0]

    # Act
    response = client.post("/api/orgs", json={"name": "  acme  "})

    # Assert
    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "detail": "Organization created",
        "data": None,
    }


async def test_get_organization_returns_member_payload(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return one organization with its members and access roles."""

    # Arrange
    owner = users[0]
    organization = await db.orgs.create("acme", owner)
    app = await db.apps.create(
        "acme",
        "dashboard",
        url="/api/apps/dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=owner,
    )

    client = clients[0]

    # Act
    response = client.get("/api/orgs/acme")

    # Assert
    assert response.status_code == 200

    expected_payload = OrgDetails(
        name="acme",
        created_at=organization.created_at,
        updated_at=organization.updated_at,
        created_by=UserSummary.model_validate(owner.model_dump()),
        updated_by=UserSummary.model_validate(owner.model_dump()),
        deleted_at=organization.deleted_at,
        deleted_by=UserSummary.model_validate(owner.model_dump()),
        users=[
            UserSummary.model_validate(
                {
                    "id": owner.id,
                    "name": owner.name,
                    "email": owner.email,
                    "avatar": owner.avatar,
                    "admin": owner.admin,
                }
            )
        ],
        apps=[
            {
                "id": app.id,
                "name": "dashboard",
                "url": "/api/apps/dashboard",
                "created_at": app.created_at,
                "updated_at": app.updated_at,
                "created_by": UserSummary.model_validate(owner.model_dump()),
                "updated_by": UserSummary.model_validate(owner.model_dump()),
                "deleted_at": None,
                "deleted_by": UserSummary.model_validate(owner.model_dump()),
            }
        ],
    ).model_dump(mode="json")

    assert response.json() == {
        "success": True,
        "detail": "Organization fetched",
        "data": expected_payload,
    }

    assert response.json()["data"]["users"][0]["avatar"] == ""
    assert response.json()["data"]["users"][0] == {
        "id": owner.id,
        "name": owner.name,
        "email": owner.email,
        "avatar": "",
        "admin": owner.admin,
    }
    assert response.json()["data"]["apps"] == [
        {
            "id": app.id,
            "name": "dashboard",
            "url": "/api/apps/dashboard",
            "created_at": app.created_at.isoformat().replace("+00:00", "Z"),
            "updated_at": app.updated_at.isoformat().replace("+00:00", "Z"),
            "created_by": UserSummary.model_validate(owner.model_dump()).model_dump(mode="json"),
            "updated_by": UserSummary.model_validate(owner.model_dump()).model_dump(mode="json"),
            "deleted_at": None,
            "deleted_by": UserSummary.model_validate(owner.model_dump()).model_dump(mode="json"),
        }
    ]


async def test_get_organization_returns_404_for_non_member(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject access when the authenticated user is not a member of the org."""

    # Arrange
    owner = users[0]
    await db.orgs.create("acme", owner)
    client = clients[1]

    # Act
    response = client.get("/api/orgs/acme")

    # Assert
    assert response.status_code == 404
    assert response.json() == {
        "success": False,
        "detail": "Org 'acme' not found",
        "data": None,
    }


async def test_get_organization_returns_envelope_for_missing_org(
    clients: tuple[TestClient, TestClient, TestClient],
) -> None:
    """Return 404 when the org does not exist."""

    # Arrange
    client = clients[0]

    # Act
    response = client.get("/api/orgs/testo")

    # Assert
    assert response.status_code == 404
    assert response.json() == {
        "success": False,
        "detail": "Org 'testo' not found",
        "data": None,
    }


async def test_delete_organization_removes_its_apps(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Delete an org and remove all apps registered under it."""

    # Arrange
    user = users[0]
    await db.orgs.create("acme", user)
    await db.apps.create("acme", "dashboard", url="/api/apps/dashboard", image="ghcr.io/longlink/dashboard:latest")
    client = clients[0]

    # Act
    response = client.delete("/api/orgs/acme")

    # Assert
    assert response.status_code == 204
    assert await db.apps.get("acme", "dashboard") is None


async def test_create_organization_returns_409_for_duplicate_name(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject duplicate organization creation requests."""

    # Arrange
    user = users[0]
    await db.orgs.create("acme", user)
    client = clients[0]

    # Act
    response = client.post("/api/orgs", json={"name": "acme"})

    # Assert
    assert response.status_code == 409
    assert response.json() == {
        "success": False,
        "detail": "Org already exists",
        "data": None,
    }


async def test_create_organization_wraps_validation_errors(
    clients: tuple[TestClient, TestClient, TestClient],
) -> None:
    """Return the shared error envelope for request validation failures."""

    # Arrange
    client = clients[0]

    # Act
    response = client.post("/api/orgs", json={})

    # Assert
    assert response.status_code == 422
    payload = response.json()
    assert payload["success"] is False
    assert payload["data"] is None
    assert isinstance(payload["detail"], str)
