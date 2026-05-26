from fastapi.testclient import TestClient

import src.db as db
from src.db.models import User


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

    organization = await db.orgs.get("acme")
    assert organization is not None

    expected_payload = {
        "org": {
            **organization.model_dump(mode="json"),
            "role": "owner",
        }
    }
    assert response.json() == expected_payload


async def test_get_organization_returns_member_payload(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return one organization with its members and access roles."""

    # Arrange
    owner = users[0]
    await db.orgs.create("acme", owner.id)

    client = clients[0]

    # Act
    response = client.get("/api/orgs/acme")

    # Assert
    assert response.status_code == 200

    organization = await db.orgs.get("acme")
    assert organization is not None

    expected_payload = {
        "org": {
            **organization.model_dump(mode="json"),
            "users": [
                {
                    **owner.model_dump(mode="json"),
                    "role": "owner",
                },
            ],
        }
    }
    assert response.json() == expected_payload


async def test_get_organization_returns_404_for_non_member(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject access when the authenticated user is not a member of the org."""

    # Arrange
    owner = users[0]
    await db.orgs.create("acme", owner.id)
    client = clients[1]

    # Act
    response = client.get("/api/orgs/acme")

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Org 'acme' not found"}


async def test_create_organization_returns_409_for_duplicate_name(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject duplicate organization creation requests."""

    # Arrange
    user = users[0]
    await db.orgs.create("acme", user.id)
    client = clients[0]

    # Act
    response = client.post("/api/orgs", json={"name": "acme"})

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Org already exists"}
