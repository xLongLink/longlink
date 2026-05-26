from fastapi.testclient import TestClient

import src.db as db
from src.db.models import User
from src.models import OrgDetails, OrgMemberResponse


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
    await db.orgs.create("acme", owner.id)

    client = clients[0]

    # Act
    response = client.get("/api/orgs/acme")

    # Assert
    assert response.status_code == 200

    expected_payload = OrgDetails(
        name="acme",
        users=[
            OrgMemberResponse.model_validate(
                {
                    "id": owner.id,
                    "name": owner.name,
                    "email": owner.email,
                    "avatar": owner.avatar,
                    "theme": owner.theme,
                    "accent": owner.accent,
                    "radius": owner.radius,
                    "language": owner.language,
                    "oidc_subject": owner.oidc_subject,
                    "role": "owner",
                }
            )
        ],
    ).model_dump(mode="json")

    assert response.json() == {
        "success": True,
        "detail": "Organization fetched",
        "data": expected_payload,
    }


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
    assert response.json() == {
        "success": False,
        "detail": "Org 'acme' not found",
        "data": None,
    }


async def test_get_organization_returns_envelope_for_missing_org(
    clients: tuple[TestClient, TestClient, TestClient],
) -> None:
    """Return the shared envelope when the org does not exist."""

    # Arrange
    client = clients[0]

    # Act
    response = client.get("/api/orgs/testo")

    # Assert
    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "detail": "Org 'testo' not found",
        "data": [],
    }


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
    assert isinstance(payload["detail"], list)
