from types import SimpleNamespace

from fastapi.testclient import TestClient

from src.database.models.users import User
from src.database.services.applications import apps
from src.database.services.compute import compute
from src.database.services.database import database
from src.database.services.locations import locations
from src.database.services.operations import operations
from src.database.services.organizations import orgs
from src.database.services.storage import storage
from src.database.services.users import users
from src.models.locations import LocationResponse
from src.models.organizations import OrgDetails, OrgSummary
from src.models.users import UserSummary

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


async def test_create_organization_returns_owner_role(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Create a new organization and return the owner role in the payload."""

    # Arrange
    owner = users[0]
    client = clients[0]
    location = await db.locations.create("local", "Local testing")

    # Act
    response = client.post("/api/orgs", json={"name": "acme", "location_id": location.id})

    # Assert
    assert response.status_code == 200
    organization = await db.orgs.get("acme")
    assert organization is not None
    assert response.json() == OrgSummary.model_validate(
        {
            "name": organization.name,
            "location_id": location.id,
            "created_at": organization.created_at,
            "updated_at": organization.updated_at,
            "created_by": UserSummary.model_validate(owner.model_dump()),
            "updated_by": UserSummary.model_validate(owner.model_dump()),
            "deleted_at": None,
            "deleted_by": None,
        }
    ).model_dump(mode="json")


async def test_get_organization_returns_member_payload(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return one organization with its members and access roles."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing")
    organization = await db.orgs.create("acme", location.id, owner)
    app = await db.apps.create(
        "acme",
        "dashboard",
        slug="dashboard",
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
        location_id=organization.location_id,
        location=LocationResponse.model_validate(location),
        created_at=organization.created_at,
        updated_at=organization.updated_at,
        created_by=UserSummary.model_validate(owner.model_dump()),
        updated_by=UserSummary.model_validate(owner.model_dump()),
        deleted_at=organization.deleted_at,
        deleted_by=None,
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
                "status": app.status,
                "description": None,
                "icon": None,
                "created_at": app.created_at,
                "updated_at": app.updated_at,
                "created_by": UserSummary.model_validate(owner.model_dump()),
                "updated_by": UserSummary.model_validate(owner.model_dump()),
                "deleted_at": None,
                "deleted_by": None,
            }
        ],
    ).model_dump(mode="json", by_alias=True)

    assert response.json() == expected_payload

    assert response.json()["users"][0]["avatar"] is None
    assert response.json()["users"][0] == {
        "id": owner.id,
        "name": owner.name,
        "email": owner.email,
        "avatar": None,
        "admin": owner.admin,
    }
    assert response.json()["apps"] == [
        {
            "id": app.id,
            "name": "dashboard",
            "status": "creating",
            "description": None,
            "icon": None,
            "created_at": app.created_at.isoformat().replace("+00:00", "Z"),
            "updated_at": app.updated_at.isoformat().replace("+00:00", "Z"),
            "created_by": UserSummary.model_validate(owner.model_dump()).model_dump(mode="json"),
            "updated_by": UserSummary.model_validate(owner.model_dump()).model_dump(mode="json"),
            "deleted_at": None,
            "deleted_by": None,
        }
    ]


async def test_list_organizations_returns_null_deleted_by_for_active_org(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return the active org audit fields without a fabricated deleted user."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing")
    organization = await db.orgs.create("acme", location.id, owner)
    client = clients[0]

    # Act
    response = client.get("/api/orgs")

    # Assert
    assert response.status_code == 200
    expected_payload = OrgSummary.model_validate(
        {
            "name": organization.name,
            "location_id": location.id,
            "created_at": organization.created_at,
            "updated_at": organization.updated_at,
            "created_by": UserSummary.model_validate(owner.model_dump()),
            "updated_by": UserSummary.model_validate(owner.model_dump()),
            "deleted_at": None,
            "deleted_by": None,
        }
    ).model_dump(mode="json")
    assert response.json() == [expected_payload]


async def test_get_organization_returns_404_for_non_member(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Reject access when the authenticated user is not a member of the org."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing")
    await db.orgs.create("acme", location.id, owner)
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
    location = await db.locations.create("local", "Local testing")
    await db.orgs.create("acme", location.id, user)
    await db.apps.create("acme", "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest")
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
    location = await db.locations.create("local", "Local testing")
    await db.orgs.create("acme", location.id, user)
    client = clients[0]

    # Act
    response = client.post("/api/orgs", json={"name": "acme", "location_id": location.id})

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
