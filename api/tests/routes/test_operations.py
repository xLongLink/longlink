from types import SimpleNamespace
from fastapi.testclient import TestClient
from src.database.services import users, locations, operations, applications, organizations
from src.models.operations import OperationKind

db = SimpleNamespace(
    applications=applications,
    locations=locations,
    operations=operations,
    organizations=organizations,
    users=users,
)


async def test_operations_endpoint_returns_recorded_operations(
    clients: tuple[TestClient, TestClient, TestClient],
    users,
) -> None:
    """Return recorded long-running operations for admin views."""

    # Arrange
    client = clients[0]
    user = users[0]
    location = await db.locations.create("local", "Local testing", user, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, user)
    application = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )
    operation = await db.operations.create(
        OperationKind.application_create,
        application_id=application.id,
        user=user,
    )

    # Act
    response = client.get("/api/operations")

    # Assert
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["id"] == str(operation.id)
    assert payload[0]["status"] == operation.status
